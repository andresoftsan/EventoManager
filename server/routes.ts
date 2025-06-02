import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { 
  loginSchema, 
  insertUserSchema, 
  insertEventSchema,
  insertClientSchema,
  insertKanbanStageSchema,
  insertTaskSchema
} from "@shared/schema";
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
      const user = await storage.getUser(req.session.userId!);
      let targetUserId = req.session.userId;

      // If admin is creating event for another user
      if (user?.isAdmin && req.body.userId) {
        targetUserId = req.body.userId;
      }

      const eventData = insertEventSchema.parse({
        ...req.body,
        userId: targetUserId
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
      let events, tasks;
      
      if (user?.isAdmin) {
        events = await storage.getAllEvents();
        tasks = await storage.getAllTasks();
      } else {
        events = await storage.getEventsByUserId(req.session.userId!);
        tasks = await storage.getTasksByUserId(req.session.userId!);
      }

      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      // Task statistics
      const openTasks = await Promise.all(
        tasks.map(async task => {
          const stage = await storage.getKanbanStage(task.stageId);
          return stage && stage.name?.toLowerCase() !== "concluído";
        })
      ).then(results => results.filter(Boolean).length);

      const overdueTasks = await Promise.all(
        tasks.map(async task => {
          const stage = await storage.getKanbanStage(task.stageId);
          const isNotCompleted = stage && stage.name?.toLowerCase() !== "concluído";
          const isOverdue = new Date(task.endDate) < new Date();
          return isNotCompleted && isOverdue;
        })
      ).then(results => results.filter(Boolean).length);

      const todayTasks = tasks.filter(task => {
        const taskEndDate = new Date(task.endDate).toISOString().split('T')[0];
        return taskEndDate === today;
      }).length;

      const stats = {
        totalEvents: events.length,
        todayEvents: events.filter(e => e.date === today).length,
        nextWeekEvents: events.filter(e => e.date >= today && e.date <= nextWeekStr).length,
        activeUsers: user?.isAdmin ? (await storage.getAllUsers()).length : 1,
        totalTasks: tasks.length,
        openTasks,
        overdueTasks,
        todayTasks,
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  // ===== CLIENT ROUTES =====
  
  // Get all clients
  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });

  // Create client (admin only)
  app.post("/api/clients", requireAuth, requireAdmin, async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar cliente" });
    }
  });

  // Update client (admin only)
  app.put("/api/clients/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const clientData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, clientData);
      
      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar cliente" });
    }
  });

  // Delete client (admin only)
  app.delete("/api/clients/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteClient(id);
      
      if (!success) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      
      res.json({ message: "Cliente excluído com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir cliente" });
    }
  });

  // ===== KANBAN STAGES ROUTES =====
  
  // Get all kanban stages
  app.get("/api/kanban-stages", requireAuth, async (req, res) => {
    try {
      const stages = await storage.getAllKanbanStages();
      res.json(stages);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar etapas do kanban" });
    }
  });

  // Create kanban stage (admin only)
  app.post("/api/kanban-stages", requireAuth, requireAdmin, async (req, res) => {
    try {
      const stageData = insertKanbanStageSchema.parse(req.body);
      const stage = await storage.createKanbanStage(stageData);
      res.status(201).json(stage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar etapa do kanban" });
    }
  });

  // Update kanban stage (admin only)
  app.put("/api/kanban-stages/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const stageData = insertKanbanStageSchema.partial().parse(req.body);
      const stage = await storage.updateKanbanStage(id, stageData);
      
      if (!stage) {
        return res.status(404).json({ message: "Etapa não encontrada" });
      }
      
      res.json(stage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar etapa do kanban" });
    }
  });

  // Delete kanban stage (admin only)
  app.delete("/api/kanban-stages/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteKanbanStage(id);
      
      if (!success) {
        return res.status(404).json({ message: "Etapa não encontrada" });
      }
      
      res.json({ message: "Etapa excluída com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir etapa do kanban" });
    }
  });

  // ===== TASK ROUTES =====
  
  // Get all tasks (with filtering)
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      let tasks;
      
      if (user?.isAdmin) {
        tasks = await storage.getAllTasks();
      } else {
        tasks = await storage.getTasksByUserId(req.session.userId!);
      }

      // Get additional data for tasks
      const tasksWithDetails = await Promise.all(
        tasks.map(async (task) => {
          const taskUser = await storage.getUser(task.userId);
          const client = await storage.getClient(task.clientId);
          const stage = await storage.getKanbanStage(task.stageId);
          
          return {
            ...task,
            userName: taskUser?.name || "Usuário desconhecido",
            clientName: client?.razaoSocial || "Cliente desconhecido",
            stageName: stage?.name || "Etapa desconhecida"
          };
        })
      );

      res.json(tasksWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar tarefas" });
    }
  });

  // Create task
  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      let targetUserId = req.session.userId;

      // If admin is creating task for another user
      if (user?.isAdmin && req.body.userId) {
        targetUserId = req.body.userId;
      }

      const taskData = insertTaskSchema.parse({
        ...req.body,
        userId: targetUserId,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate)
      });

      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar tarefa" });
    }
  });

  // Update task
  app.put("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(req.session.userId!);
      const task = await storage.getTask(id);

      if (!task) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }

      // Check if user can update this task
      if (!user?.isAdmin && task.userId !== req.session.userId) {
        return res.status(403).json({ message: "Não autorizado a atualizar esta tarefa" });
      }

      const updateData = { ...req.body };
      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate);
      }

      const taskData = insertTaskSchema.partial().parse(updateData);
      const updatedTask = await storage.updateTask(id, taskData);
      
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar tarefa" });
    }
  });

  // Delete task
  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(req.session.userId!);
      const task = await storage.getTask(id);

      if (!task) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }

      // Check if user can delete this task
      if (!user?.isAdmin && task.userId !== req.session.userId) {
        return res.status(403).json({ message: "Não autorizado a excluir esta tarefa" });
      }

      const success = await storage.deleteTask(id);
      if (!success) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }

      res.json({ message: "Tarefa excluída com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir tarefa" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
