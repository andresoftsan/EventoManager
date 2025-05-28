import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { loginSchema, insertUserSchema, insertEventSchema } from "@shared/schema";
import { z } from "zod";

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Não autorizado" });
    }
    next();
  };

  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Não autorizado" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Usuário ou senha incorretos" });
      }

      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Não autorizado" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Usuário não encontrado" });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  });

  // User routes
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPassword = users.map(user => {
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Nome de usuário já existe" });
      }

      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar usuário" });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteUser(id);
      
      if (!success) {
        return res.status(404).json({ message: "Usuário não encontrado ou não pode ser excluído" });
      }

      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  });

  // Event routes
  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      let events;
      
      if (user?.isAdmin) {
        events = await storage.getAllEvents();
      } else {
        events = await storage.getEventsByUserId(req.session.userId!);
      }

      // Get user names for events
      const eventsWithUserNames = await Promise.all(
        events.map(async (event) => {
          const eventUser = await storage.getUser(event.userId);
          return {
            ...event,
            userName: eventUser?.name || "Usuário desconhecido"
          };
        })
      );

      res.json(eventsWithUserNames);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar eventos" });
    }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const eventData = insertEventSchema.parse({
        ...req.body,
        userId: req.session.userId
      });

      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar evento" });
    }
  });

  app.put("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const eventData = insertEventSchema.omit({ userId: true }).parse(req.body);

      // Check if event exists and user has permission
      const existingEvent = await storage.getEvent(id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin && existingEvent.userId !== req.session.userId) {
        return res.status(403).json({ message: "Não autorizado a editar este evento" });
      }

      const updatedEvent = await storage.updateEvent(id, eventData);
      res.json(updatedEvent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar evento" });
    }
  });

  app.delete("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Check if event exists and user has permission
      const existingEvent = await storage.getEvent(id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin && existingEvent.userId !== req.session.userId) {
        return res.status(403).json({ message: "Não autorizado a excluir este evento" });
      }

      const success = await storage.deleteEvent(id);
      if (!success) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }

      res.json({ message: "Evento excluído com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir evento" });
    }
  });

  // Stats route for dashboard
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      let events;
      
      if (user?.isAdmin) {
        events = await storage.getAllEvents();
      } else {
        events = await storage.getEventsByUserId(req.session.userId!);
      }

      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      const stats = {
        totalEvents: events.length,
        todayEvents: events.filter(e => e.date === today).length,
        nextWeekEvents: events.filter(e => e.date >= today && e.date <= nextWeekStr).length,
        activeUsers: user?.isAdmin ? (await storage.getAllUsers()).length : 1,
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
