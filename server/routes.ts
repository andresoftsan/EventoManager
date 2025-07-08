import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { 
  loginSchema, 
  insertUserSchema, 
  insertEventSchema,
  insertClientSchema,
  insertCompanySchema,
  insertKanbanStageSchema,
  insertTaskSchema,
  insertChecklistItemSchema
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
      const currentUser = await storage.getUser(req.session.userId!);
      let users;
      
      if (currentUser?.isAdmin) {
        // Master admin (username "admin") sees all users
        if (currentUser.username === "admin") {
          users = await storage.getAllUsers();
        } else {
          // Other admin users see only users who share at least one company
          const allUsers = await storage.getAllUsers();
          
          users = allUsers.filter(user => {
            // Always include the current user
            if (user.id === currentUser.id) return true;
            
            // Check if admin and user share at least one company
            const adminCompanies = currentUser.companyIds || [];
            const userCompanies = user.companyIds || [];
            const hasSharedCompany = adminCompanies.some(companyId => 
              userCompanies.includes(companyId)
            );
            
            return hasSharedCompany;
          });
        }
      } else {
        // Non-admin users see all users (for user selection in forms)
        users = await storage.getAllUsers();
      }
      
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

  app.put("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = insertUserSchema.partial().parse(req.body);
      
      // Check if username already exists (excluding current user)
      if (userData.username) {
        const existingUser = await storage.getUserByUsername(userData.username);
        if (existingUser && existingUser.id !== id) {
          return res.status(409).json({ message: "Nome de usuário já existe" });
        }
      }

      const updatedUser = await storage.updateUser(id, userData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar usuário" });
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
        // Admin users see events from users who share at least one company
        const allEvents = await storage.getAllEvents();
        const allUsers = await storage.getAllUsers();
        
        // Master admin (username "admin") can see all events
        if (user.username === "admin") {
          events = allEvents;
        } else {
          // Get events from users who share companies with current admin
          events = await Promise.all(
            allEvents.map(async (event) => {
              const eventUser = allUsers.find(u => u.id === event.userId);
              if (!eventUser) return null;
              
              // Check if admin and event user share at least one company
              const userCompanies = user.companyIds || [];
              const eventUserCompanies = eventUser.companyIds || [];
              const hasSharedCompany = userCompanies.some(companyId => 
                eventUserCompanies.includes(companyId)
              );
              
              return hasSharedCompany ? event : null;
            })
          );
          
          // Filter out null events
          events = events.filter(event => event !== null);
        }
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
          
          // Compare dates without time component
          const taskEndDate = new Date(task.endDate);
          const today = new Date();
          const taskEndDateOnly = new Date(taskEndDate.getFullYear(), taskEndDate.getMonth(), taskEndDate.getDate());
          const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          
          const isOverdue = taskEndDateOnly < todayOnly;
          return isNotCompleted && isOverdue;
        })
      ).then(results => results.filter(Boolean).length);

      const todayTasks = tasks.filter(task => {
        const taskEndDate = new Date(task.endDate).toISOString().split('T')[0];
        return taskEndDate === today;
      }).length;

      // Process step instances statistics
      let pendingProcessSteps = 0;
      let overdueProcessSteps = 0;
      let todayProcessSteps = 0;
      
      if (user?.isAdmin) {
        // Admin sees all pending steps
        const allSteps = await storage.getProcessStepInstancesByUserId(req.session.userId!);
        const allPendingSteps: any[] = [];
        
        // Get all users and their pending steps
        const allUsers = await storage.getAllUsers();
        for (const u of allUsers) {
          const userSteps = await storage.getProcessStepInstancesByUserId(u.id);
          allPendingSteps.push(...userSteps.filter(step => 
            step.status === "pending" || step.status === "in_progress" || step.status === "waiting"
          ));
        }
        
        pendingProcessSteps = allPendingSteps.length;
        
        // Count overdue process steps
        overdueProcessSteps = allPendingSteps.filter(step => {
          if (!step.dueDate) return false;
          
          // Compare dates without time component
          const stepDueDate = new Date(step.dueDate);
          const today = new Date();
          const stepDueDateOnly = new Date(stepDueDate.getFullYear(), stepDueDate.getMonth(), stepDueDate.getDate());
          const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          
          return stepDueDateOnly < todayOnly;
        }).length;
        
        // Count process steps due today
        todayProcessSteps = allPendingSteps.filter(step => {
          if (!step.dueDate) return false;
          const stepDueDate = new Date(step.dueDate).toISOString().split('T')[0];
          return stepDueDate === today;
        }).length;
      } else {
        // Regular user sees only their own steps
        const userSteps = await storage.getProcessStepInstancesByUserId(req.session.userId!);
        const userPendingSteps = userSteps.filter(step => 
          step.status === "pending" || step.status === "in_progress" || step.status === "waiting"
        );
        
        pendingProcessSteps = userPendingSteps.length;
        
        // Count overdue process steps
        overdueProcessSteps = userPendingSteps.filter(step => {
          if (!step.dueDate) return false;
          
          // Compare dates without time component
          const stepDueDate = new Date(step.dueDate);
          const today = new Date();
          const stepDueDateOnly = new Date(stepDueDate.getFullYear(), stepDueDate.getMonth(), stepDueDate.getDate());
          const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          
          return stepDueDateOnly < todayOnly;
        }).length;
        
        // Count process steps due today
        todayProcessSteps = userPendingSteps.filter(step => {
          if (!step.dueDate) return false;
          const stepDueDate = new Date(step.dueDate).toISOString().split('T')[0];
          return stepDueDate === today;
        }).length;
      }

      const stats = {
        totalEvents: events.length,
        todayEvents: events.filter(e => e.date === today).length,
        nextWeekEvents: events.filter(e => e.date >= today && e.date <= nextWeekStr).length,
        activeUsers: user?.isAdmin ? (await storage.getAllUsers()).length : 1,
        totalTasks: tasks.length,
        openTasks,
        overdueTasks,
        todayTasks,
        pendingProcessSteps,
        overdueProcessSteps,
        todayProcessSteps,
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

  // Get single client by ID
  app.get("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar cliente" });
    }
  });

  // Create client
  app.post("/api/clients", requireAuth, async (req, res) => {
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

  // Update client
  app.put("/api/clients/:id", requireAuth, async (req, res) => {
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

  // ===== EXTERNAL API INTEGRATION =====
  
  // Create client via external API (no authentication required for system integration)
  app.post("/api/external/clients", async (req, res) => {
    try {
      // Validate API key from headers
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== process.env.EXTERNAL_API_KEY) {
        return res.status(401).json({ 
          message: "Chave de API inválida ou ausente. Use o header 'x-api-key'." 
        });
      }

      // Parse and validate client data
      const clientData = insertClientSchema.parse(req.body);
      
      // Check if client already exists by CNPJ
      if (clientData.cnpj) {
        const existingClients = await storage.getAllClients();
        const existingClient = existingClients.find(client => client.cnpj === clientData.cnpj);
        
        if (existingClient) {
          return res.status(409).json({ 
            message: "Cliente já existe com este CNPJ",
            existingClient: {
              id: existingClient.id,
              razaoSocial: existingClient.razaoSocial,
              cnpj: existingClient.cnpj
            }
          });
        }
      }

      // Create the client
      const client = await storage.createClient(clientData);
      
      res.status(201).json({
        message: "Cliente criado com sucesso",
        client: {
          id: client.id,
          razaoSocial: client.razaoSocial,
          nomeFantasia: client.nomeFantasia,
          cnpj: client.cnpj,
          email: client.email,
          telefone: client.telefone,
          endereco: client.endereco
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      console.error("Erro ao criar cliente via API externa:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Update client via external API
  app.put("/api/external/clients/:id", async (req, res) => {
    try {
      // Validate API key from headers
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== process.env.EXTERNAL_API_KEY) {
        return res.status(401).json({ 
          message: "Chave de API inválida ou ausente. Use o header 'x-api-key'." 
        });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Parse and validate client data
      const clientData = insertClientSchema.partial().parse(req.body);
      
      // Check if client exists
      const existingClient = await storage.getClient(id);
      if (!existingClient) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      // Check CNPJ uniqueness if updating CNPJ
      if (clientData.cnpj && clientData.cnpj !== existingClient.cnpj) {
        const allClients = await storage.getAllClients();
        const cnpjExists = allClients.find(client => client.cnpj === clientData.cnpj && client.id !== id);
        
        if (cnpjExists) {
          return res.status(409).json({ 
            message: "Já existe outro cliente com este CNPJ",
            existingClient: {
              id: cnpjExists.id,
              razaoSocial: cnpjExists.razaoSocial,
              cnpj: cnpjExists.cnpj
            }
          });
        }
      }

      // Update the client
      const updatedClient = await storage.updateClient(id, clientData);
      
      if (!updatedClient) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      res.json({
        message: "Cliente atualizado com sucesso",
        client: {
          id: updatedClient.id,
          razaoSocial: updatedClient.razaoSocial,
          nomeFantasia: updatedClient.nomeFantasia,
          cnpj: updatedClient.cnpj,
          email: updatedClient.email,
          telefone: updatedClient.telefone,
          endereco: updatedClient.endereco
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      console.error("Erro ao atualizar cliente via API externa:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get client by CNPJ via external API
  app.get("/api/external/clients/cnpj/:cnpj", async (req, res) => {
    try {
      // Validate API key from headers
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== process.env.EXTERNAL_API_KEY) {
        return res.status(401).json({ 
          message: "Chave de API inválida ou ausente. Use o header 'x-api-key'." 
        });
      }

      const cnpj = req.params.cnpj;
      
      // Get all clients and find by CNPJ
      const allClients = await storage.getAllClients();
      const client = allClients.find(client => client.cnpj === cnpj);
      
      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      res.json({
        client: {
          id: client.id,
          razaoSocial: client.razaoSocial,
          nomeFantasia: client.nomeFantasia,
          cnpj: client.cnpj,
          email: client.email,
          telefone: client.telefone,
          endereco: client.endereco
        }
      });
    } catch (error) {
      console.error("Erro ao buscar cliente por CNPJ via API externa:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== COMPANIES ROUTES =====
  
  // Get all companies (admin only)
  app.get("/api/companies", requireAuth, requireAdmin, async (req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar empresas" });
    }
  });

  // Create company (admin only)
  app.post("/api/companies", requireAuth, requireAdmin, async (req, res) => {
    try {
      const companyData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(companyData);
      res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar empresa" });
    }
  });

  // Update company (admin only)
  app.put("/api/companies/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const companyData = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(id, companyData);
      
      if (!company) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }
      
      res.json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar empresa" });
    }
  });

  // Delete company (admin only)
  app.delete("/api/companies/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCompany(id);
      
      if (!success) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }
      
      res.json({ message: "Empresa excluída com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir empresa" });
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
        // Admin users see tasks from users who share at least one company
        const allTasks = await storage.getAllTasks();
        const allUsers = await storage.getAllUsers();
        
        // Master admin (username "admin") can see all tasks
        if (user.username === "admin") {
          tasks = allTasks;
        } else {
          // Get tasks from users who share companies with current admin
          tasks = await Promise.all(
            allTasks.map(async (task) => {
              const taskUser = allUsers.find(u => u.id === task.userId);
              if (!taskUser) return null;
              
              // Check if admin and task user share at least one company
              const userCompanies = user.companyIds || [];
              const taskUserCompanies = taskUser.companyIds || [];
              const hasSharedCompany = userCompanies.some(companyId => 
                taskUserCompanies.includes(companyId)
              );
              
              return hasSharedCompany ? task : null;
            })
          );
          
          // Filter out null tasks
          tasks = tasks.filter(task => task !== null);
        }
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
        startDate: req.body.startDate,
        endDate: req.body.endDate
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

  // ===== CHECKLIST ROUTES =====

  // Get checklist items for a task
  app.get("/api/tasks/:taskId/checklist", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      
      // Verify task exists and user has access
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin && task.userId !== req.session.userId) {
        return res.status(403).json({ message: "Não autorizado" });
      }

      const checklistItems = await storage.getChecklistItemsByTaskId(taskId);
      res.json(checklistItems);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar checklist" });
    }
  });

  // Create checklist item
  app.post("/api/tasks/:taskId/checklist", requireAuth, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      
      // Verify task exists and user has access
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin && task.userId !== req.session.userId) {
        return res.status(403).json({ message: "Não autorizado" });
      }

      const checklistData = insertChecklistItemSchema.parse({
        ...req.body,
        taskId
      });

      const checklistItem = await storage.createChecklistItem(checklistData);
      res.status(201).json(checklistItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar item do checklist" });
    }
  });

  // Update checklist item
  app.put("/api/checklist/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const checklistData = insertChecklistItemSchema.partial().parse(req.body);

      // Get the checklist item to verify task ownership
      const checklistItem = await storage.updateChecklistItem(id, { completed: false }); // temp to get item
      if (!checklistItem) {
        return res.status(404).json({ message: "Item do checklist não encontrado" });
      }

      const task = await storage.getTask(checklistItem.taskId);
      if (!task) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin && task.userId !== req.session.userId) {
        return res.status(403).json({ message: "Não autorizado" });
      }

      const updatedItem = await storage.updateChecklistItem(id, checklistData);
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar item do checklist" });
    }
  });

  // Delete checklist item
  app.delete("/api/checklist/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Get the checklist item to verify task ownership
      const checklistItems = await storage.getChecklistItemsByTaskId(0); // Get all to find this one
      const checklistItem = checklistItems.find(item => item.id === id);
      
      if (!checklistItem) {
        return res.status(404).json({ message: "Item do checklist não encontrado" });
      }

      const task = await storage.getTask(checklistItem.taskId);
      if (!task) {
        return res.status(404).json({ message: "Tarefa não encontrada" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin && task.userId !== req.session.userId) {
        return res.status(403).json({ message: "Não autorizado" });
      }

      const success = await storage.deleteChecklistItem(id);
      if (!success) {
        return res.status(404).json({ message: "Item do checklist não encontrado" });
      }

      res.json({ message: "Item do checklist excluído com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir item do checklist" });
    }
  });

  // ===== PROCESS TEMPLATE ROUTES =====
  
  // Get all process templates
  app.get("/api/process-templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getAllProcessTemplates();
      
      // Get additional details for templates
      const templatesWithDetails = await Promise.all(
        templates.map(async (template) => {
          const steps = await storage.getProcessStepsByTemplateId(template.id);
          const creator = await storage.getUser(template.createdBy);
          
          return {
            ...template,
            stepsCount: steps.length,
            createdByName: creator?.name || "Usuário desconhecido"
          };
        })
      );

      res.json(templatesWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar modelos de processo" });
    }
  });

  // Create process template
  app.post("/api/process-templates", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Apenas administradores podem criar modelos de processo" });
      }

      const templateData = { 
        name: req.body.name,
        description: req.body.description,
        createdBy: req.session.userId!
      };
      const template = await storage.createProcessTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar modelo de processo" });
    }
  });

  // Create process step
  app.post("/api/process-steps", requireAuth, async (req, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Apenas administradores podem criar etapas de processo" });
      }



      const stepData = {
        templateId: req.body.templateId,
        name: req.body.name,
        description: req.body.description,
        order: req.body.order,
        responsibleUserId: req.body.responsibleUserId,
        deadlineDays: req.body.deadlineDays || 7,
        formFields: req.body.formFields || []
      };
      const step = await storage.createProcessStep(stepData);
      res.status(201).json(step);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar etapa do processo" });
    }
  });

  // Get process template with steps for editing
  app.get("/api/process-templates/:id/edit", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getProcessTemplate(id);
      
      if (!template) {
        return res.status(404).json({ message: "Modelo de processo não encontrado" });
      }

      const steps = await storage.getProcessStepsByTemplateId(id);
      
      res.json({
        ...template,
        steps: steps.sort((a, b) => a.order - b.order)
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar modelo de processo" });
    }
  });

  // Update process template
  app.put("/api/process-templates/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, steps } = req.body;
      
      // Update template
      const updatedTemplate = await storage.updateProcessTemplate(id, {
        name,
        description
      });
      
      if (!updatedTemplate) {
        return res.status(404).json({ message: "Modelo de processo não encontrado" });
      }

      // Delete existing steps
      const existingSteps = await storage.getProcessStepsByTemplateId(id);
      for (const step of existingSteps) {
        await storage.deleteProcessStep(step.id);
      }

      // Create new steps
      for (const step of steps) {
        await storage.createProcessStep({
          templateId: id,
          name: step.name,
          description: step.description,
          order: step.order,
          responsibleUserId: step.responsibleUserId,
          formFields: step.formFields || []
        });
      }

      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error updating process template:", error);
      res.status(500).json({ message: "Erro ao atualizar modelo de processo" });
    }
  });

  // Delete process template (admin only)
  app.delete("/api/process-templates/:id", requireAuth, async (req, res) => {
    try {
      const sessionData = req.session as any;
      const user = await storage.getUser(sessionData.userId!);
      
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores podem excluir modelos de processo." });
      }

      const id = parseInt(req.params.id);
      
      // Check if template has active process instances
      const allInstances = await storage.getAllProcessInstances();
      const hasActiveInstances = allInstances.some(instance => 
        instance.templateId === id && instance.status !== 'completed'
      );
      
      if (hasActiveInstances) {
        return res.status(400).json({ 
          message: "Não é possível excluir este modelo pois existem processos ativos vinculados a ele." 
        });
      }
      
      // Delete all steps first
      const steps = await storage.getProcessStepsByTemplateId(id);
      for (const step of steps) {
        await storage.deleteProcessStep(step.id);
      }
      
      const success = await storage.deleteProcessTemplate(id);
      
      if (!success) {
        return res.status(404).json({ message: "Modelo de processo não encontrado" });
      }

      res.json({ message: "Modelo de processo excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting process template:", error);
      res.status(500).json({ message: "Erro ao excluir modelo de processo" });
    }
  });

  // ===== PROCESS INSTANCE ROUTES =====
  
  // Get process instance by number
  app.get("/api/process-instances/number/:processNumber", requireAuth, async (req, res) => {
    try {
      const { processNumber } = req.params;
      const instance = await storage.getProcessInstanceByNumber(processNumber);
      
      if (!instance) {
        return res.status(404).json({ message: "Processo não encontrado" });
      }

      const template = await storage.getProcessTemplate(instance.templateId);
      const client = await storage.getClient(instance.clientId);
      const starter = await storage.getUser(instance.startedBy);
      const currentStep = instance.currentStepId ? await storage.getProcessStep(instance.currentStepId) : null;
      
      const instanceWithDetails = {
        ...instance,
        templateName: template?.name || "Modelo desconhecido",
        clientName: client?.razaoSocial || "Cliente desconhecido",
        startedByName: starter?.name || "Usuário desconhecido",
        currentStepName: currentStep?.name
      };

      res.json(instanceWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar processo" });
    }
  });
  
  // Get all process instances
  app.get("/api/process-instances", requireAuth, async (req, res) => {
    try {
      const instances = await storage.getAllProcessInstances();
      
      const instancesWithDetails = await Promise.all(
        instances.map(async (instance) => {
          const template = await storage.getProcessTemplate(instance.templateId);
          const client = await storage.getClient(instance.clientId);
          const starter = await storage.getUser(instance.startedBy);
          const currentStep = instance.currentStepId ? await storage.getProcessStep(instance.currentStepId) : null;
          
          return {
            ...instance,
            templateName: template?.name || "Modelo desconhecido",
            clientName: client?.razaoSocial || "Cliente desconhecido",
            startedByName: starter?.name || "Usuário desconhecido",
            currentStepName: currentStep?.name
          };
        })
      );

      res.json(instancesWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar processos" });
    }
  });

  // Start new process instance
  app.post("/api/process-instances", requireAuth, async (req, res) => {
    try {
      const { templateId, clientId } = req.body;
      const userId = req.session.userId!;
      
      // Get template and its steps
      const template = await storage.getProcessTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Modelo de processo não encontrado" });
      }

      // Check if user has access to start this process (unless admin)
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        const hasAccess = await storage.checkProcessTemplateUserAccess(templateId, userId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Você não tem permissão para iniciar este processo" });
        }
      }

      const steps = await storage.getProcessStepsByTemplateId(templateId);
      steps.sort((a, b) => a.order - b.order);

      if (steps.length === 0) {
        return res.status(400).json({ message: "Modelo de processo não possui etapas" });
      }

      // Get client name for process name
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      // Create process instance
      const instanceData = {
        templateId,
        clientId,
        name: `${template.name} - ${client.razaoSocial}`,
        startedBy: req.session.userId!,
        currentStepId: steps[0].id,
      };

      const instance = await storage.createProcessInstance(instanceData);

      // Create step instances for all steps with calculated due dates
      let cumulativeDays = 0;
      for (const step of steps) {
        // Calculate due date based on cumulative deadline days from process start
        const startDate = new Date(instance.startedAt);
        const stepDeadlineDays = step.deadlineDays || 7;
        cumulativeDays += stepDeadlineDays;
        const dueDate = new Date(startDate.getTime() + cumulativeDays * 24 * 60 * 60 * 1000);

        const stepInstanceData = {
          processInstanceId: instance.id,
          stepId: step.id,
          assignedUserId: step.responsibleUserId,
          status: step.order === 1 ? "pending" : "waiting", // Only first step is pending
          dueDate: dueDate,
          formData: {},
        };
        
        await storage.createProcessStepInstance(stepInstanceData);
      }

      res.status(201).json(instance);
    } catch (error) {
      res.status(500).json({ message: "Erro ao iniciar processo" });
    }
  });

  // Delete process instance (admin only)
  app.delete("/api/process-instances/:id", requireAuth, async (req, res) => {
    try {
      const sessionData = req.session as any;
      const user = await storage.getUser(sessionData.userId!);
      
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores podem excluir processos." });
      }

      const id = parseInt(req.params.id);
      
      // Delete all step instances first
      const stepInstances = await storage.getProcessStepInstancesByProcessId(id);
      for (const stepInstance of stepInstances) {
        await storage.deleteProcessStepInstance(stepInstance.id);
      }
      
      // Delete the process instance
      const success = await storage.deleteProcessInstance(id);
      
      if (!success) {
        return res.status(404).json({ message: "Processo não encontrado" });
      }

      res.json({ message: "Processo excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting process instance:", error);
      res.status(500).json({ message: "Erro ao excluir processo" });
    }
  });

  // Get complete process report for printing/viewing
  app.get("/api/process-instances/:id/report", requireAuth, async (req, res) => {
    try {
      const processId = parseInt(req.params.id);
      
      // Get process instance
      const instance = await storage.getProcessInstance(processId);
      if (!instance) {
        return res.status(404).json({ message: "Processo não encontrado" });
      }

      // Get related data
      const template = await storage.getProcessTemplate(instance.templateId);
      const client = await storage.getClient(instance.clientId);
      const starter = await storage.getUser(instance.startedBy);
      
      // Get all step instances with details
      const stepInstances = await storage.getProcessStepInstancesByProcessId(processId);
      
      const stepsWithDetails = await Promise.all(
        stepInstances.map(async (stepInstance) => {
          const step = await storage.getProcessStep(stepInstance.stepId);
          const assignedUser = await storage.getUser(stepInstance.assignedUserId);
          
          return {
            ...stepInstance,
            stepName: step?.name || "Etapa desconhecida",
            stepDescription: step?.description || "",
            stepOrder: step?.order || 0,
            assignedUserName: assignedUser?.name || "Usuário desconhecido",
            formFields: step?.formFields || []
          };
        })
      );
      
      // Sort by step order
      stepsWithDetails.sort((a, b) => a.stepOrder - b.stepOrder);
      
      const processReport = {
        processInfo: {
          id: instance.id,
          processNumber: instance.processNumber,
          name: instance.name,
          status: instance.status,
          startedAt: instance.startedAt,
          templateName: template?.name || "Modelo desconhecido",
          clientName: client?.razaoSocial || "Cliente desconhecido",
          startedByName: starter?.name || "Usuário desconhecido"
        },
        steps: stepsWithDetails
      };
      
      res.json(processReport);
    } catch (error) {
      console.error("Error generating process report:", error);
      res.status(500).json({ message: "Erro ao gerar relatório do processo" });
    }
  });

  // ===== PROCESS STEP INSTANCE ROUTES =====
  
  // Get all step instances for a specific process
  app.get("/api/process-instances/:id/steps", requireAuth, async (req, res) => {
    try {
      const processId = parseInt(req.params.id);
      const stepInstances = await storage.getProcessStepInstancesByProcessId(processId);
      
      const stepsWithDetails = await Promise.all(
        stepInstances.map(async (stepInstance) => {
          const step = await storage.getProcessStep(stepInstance.stepId);
          const assignedUser = await storage.getUser(stepInstance.assignedUserId);
          
          return {
            ...stepInstance,
            stepName: step?.name || "Etapa desconhecida",
            stepOrder: step?.order || 0,
            stepDescription: step?.description || "",
            assignedUserName: assignedUser?.name || "Usuário desconhecido"
          };
        })
      );
      
      // Sort by step order
      stepsWithDetails.sort((a, b) => a.stepOrder - b.stepOrder);
      
      res.json(stepsWithDetails);
    } catch (error) {
      console.error("Error fetching process steps:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get my pending tasks
  app.get("/api/process-step-instances/my-tasks", requireAuth, async (req, res) => {
    try {
      const myTasks = await storage.getProcessStepInstancesByUserId(req.session.userId!);
      const pendingTasks = myTasks.filter(task => 
        task.status === "pending" || 
        task.status === "in_progress" || 
        task.status === "waiting"
      );
      
      const tasksWithDetails = await Promise.all(
        pendingTasks.map(async (task) => {
          const step = await storage.getProcessStep(task.stepId);
          const processInstance = await storage.getProcessInstance(task.processInstanceId);
          const template = processInstance ? await storage.getProcessTemplate(processInstance.templateId) : null;
          const client = processInstance ? await storage.getClient(processInstance.clientId) : null;
          
          return {
            ...task,
            stepName: step?.name || "Etapa desconhecida",
            processName: processInstance?.name || "Processo desconhecido",
            processNumber: processInstance?.processNumber || "N/A",
            templateName: template?.name || "Modelo desconhecido",
            clientName: client?.razaoSocial || "Cliente desconhecido",
            stepOrder: step?.order || 0,
            formFields: step?.formFields || []
          };
        })
      );

      res.json(tasksWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar tarefas pendentes" });
    }
  });

  // Execute process step instance
  app.post("/api/process-step-instances/:id/execute", requireAuth, async (req, res) => {
    try {
      const stepInstanceId = parseInt(req.params.id);
      const { formData, notes } = req.body;

      const stepInstance = await storage.getProcessStepInstance(stepInstanceId);
      if (!stepInstance) {
        return res.status(404).json({ message: "Instância de etapa não encontrada" });
      }

      // Check if user is assigned to this step
      if (stepInstance.assignedUserId !== req.session.userId) {
        return res.status(403).json({ message: "Não autorizado a executar esta etapa" });
      }

      // Check if step is already completed
      if (stepInstance.status === "completed") {
        return res.status(400).json({ message: "Esta etapa já foi executada" });
      }

      // Get the step to check order
      const step = await storage.getProcessStep(stepInstance.stepId);
      if (!step) {
        return res.status(404).json({ message: "Etapa não encontrada" });
      }

      // Check if previous steps are completed (sequential execution)
      if (step.order > 1) {
        const processInstance = await storage.getProcessInstance(stepInstance.processInstanceId);
        if (processInstance) {
          const allSteps = await storage.getProcessStepsByTemplateId(processInstance.templateId);
          allSteps.sort((a, b) => a.order - b.order);
          
          const allStepInstances = await storage.getProcessStepInstancesByProcessId(processInstance.id);
          
          // Check if all previous steps are completed
          for (let i = 0; i < step.order - 1; i++) {
            const previousStep = allSteps[i];
            const previousStepInstance = allStepInstances.find(si => si.stepId === previousStep.id);
            
            if (!previousStepInstance || previousStepInstance.status !== "completed") {
              return res.status(400).json({ 
                message: `Você deve executar a etapa ${previousStep.order} (${previousStep.name}) antes desta` 
              });
            }
          }
        }
      }

      // Mark step as in progress first, then completed
      await storage.updateProcessStepInstance(stepInstanceId, {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      });

      // Update step instance with completion
      const updatedStepInstance = await storage.updateProcessStepInstance(stepInstanceId, {
        status: "completed",
        formData: formData || {},
        notes: notes || "",
        completedAt: new Date().toISOString(),
      });

      if (!updatedStepInstance) {
        return res.status(500).json({ message: "Erro ao atualizar instância de etapa" });
      }

      // Get process instance and check if we need to move to next step
      const processInstance = await storage.getProcessInstance(stepInstance.processInstanceId);
      if (processInstance) {
        const allSteps = await storage.getProcessStepsByTemplateId(processInstance.templateId);
        allSteps.sort((a, b) => a.order - b.order);
        
        const allStepInstances = await storage.getProcessStepInstancesByProcessId(processInstance.id);
        const currentStepIndex = allSteps.findIndex(step => step.id === stepInstance.stepId);
        
        // Check if there's a next step
        if (currentStepIndex < allSteps.length - 1) {
          const nextStep = allSteps[currentStepIndex + 1];
          const nextStepInstance = allStepInstances.find(si => si.stepId === nextStep.id);
          
          // Update process current step
          await storage.updateProcessInstance(processInstance.id, {
            currentStepId: nextStep.id,
          });
          
          // Mark next step as pending (available for execution)
          if (nextStepInstance) {
            await storage.updateProcessStepInstance(nextStepInstance.id, {
              status: "pending",
            });
          }
        } else {
          // All steps completed, mark process as completed
          await storage.updateProcessInstance(processInstance.id, {
            status: "completed",
            completedAt: new Date().toISOString(),
          });
        }
      }

      res.json(updatedStepInstance);
    } catch (error) {
      console.error("Error executing step:", error);
      res.status(500).json({ message: "Erro ao executar etapa do processo" });
    }
  });

  // Process Template User Access routes
  app.get("/api/process-templates/:templateId/users", requireAuth, async (req, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const access = await storage.getProcessTemplateUserAccess(templateId);
      
      // Get user details for each access entry
      const usersWithAccess = await Promise.all(
        access.map(async (accessEntry) => {
          const user = await storage.getUser(accessEntry.userId);
          return user ? { id: user.id, name: user.name, username: user.username } : null;
        })
      );
      
      res.json(usersWithAccess.filter(user => user !== null));
    } catch (error) {
      console.error("Error getting template user access:", error);
      res.status(500).json({ message: "Erro ao buscar usuários com acesso" });
    }
  });

  app.post("/api/process-templates/:templateId/users", requireAuth, async (req, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const { userId } = req.body;
      
      // Check if access already exists
      const hasAccess = await storage.checkProcessTemplateUserAccess(templateId, userId);
      if (hasAccess) {
        return res.status(400).json({ message: "Usuário já possui acesso a este template" });
      }
      
      const access = await storage.addProcessTemplateUserAccess({ templateId, userId });
      res.status(201).json(access);
    } catch (error) {
      console.error("Error adding template user access:", error);
      res.status(500).json({ message: "Erro ao adicionar acesso do usuário" });
    }
  });

  app.delete("/api/process-templates/:templateId/users/:userId", requireAuth, async (req, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const userId = parseInt(req.params.userId);
      
      const removed = await storage.removeProcessTemplateUserAccess(templateId, userId);
      if (removed) {
        res.json({ message: "Acesso removido com sucesso" });
      } else {
        res.status(404).json({ message: "Acesso não encontrado" });
      }
    } catch (error) {
      console.error("Error removing template user access:", error);
      res.status(500).json({ message: "Erro ao remover acesso do usuário" });
    }
  });

  // Get accessible process templates for current user
  app.get("/api/process-templates/accessible", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      let templates;
      if (user?.isAdmin) {
        // Admins can see all templates
        templates = await storage.getAllProcessTemplates();
      } else {
        // Regular users only see templates they have access to
        templates = await storage.getAccessibleProcessTemplates(userId);
      }
      
      // Get additional details for templates
      const templatesWithDetails = await Promise.all(
        templates.map(async (template) => {
          const steps = await storage.getProcessStepsByTemplateId(template.id);
          const creator = await storage.getUser(template.createdBy);
          
          return {
            ...template,
            stepsCount: steps.length,
            createdByName: creator?.name || "Usuário desconhecido"
          };
        })
      );

      res.json(templatesWithDetails);
    } catch (error) {
      console.error("Error getting accessible templates:", error);
      res.status(500).json({ message: "Erro ao buscar templates acessíveis" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
