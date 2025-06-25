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
        // Admin users see only users who share at least one company
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

  app.post("/api/users", requireAuth, async (req, res) => {
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
      const stepData = {
        templateId: req.body.templateId,
        name: req.body.name,
        description: req.body.description,
        order: req.body.order,
        responsibleUserId: req.body.responsibleUserId,
        formFields: req.body.formFields || []
      };
      const step = await storage.createProcessStep(stepData);
      res.status(201).json(step);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar etapa do processo" });
    }
  });

  // Delete process template
  app.delete("/api/process-templates/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProcessTemplate(id);
      
      if (!success) {
        return res.status(404).json({ message: "Modelo de processo não encontrado" });
      }

      res.json({ message: "Modelo de processo excluído com sucesso" });
    } catch (error) {
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
        clientName: client?.name || "Cliente desconhecido",
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
            clientName: client?.name || "Cliente desconhecido",
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
      
      // Get template and its steps
      const template = await storage.getProcessTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Modelo de processo não encontrado" });
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
        name: `${template.name} - ${client.name}`,
        startedBy: req.session.userId!,
        currentStepId: steps[0].id,
      };

      const instance = await storage.createProcessInstance(instanceData);

      // Create step instances for all steps - only first step is pending
      for (const step of steps) {
        const stepInstanceData = {
          processInstanceId: instance.id,
          stepId: step.id,
          assignedUserId: step.responsibleUserId,
          status: step.order === 1 ? "pending" : "waiting", // Only first step is pending
          formData: {},
        };
        
        await storage.createProcessStepInstance(stepInstanceData);
      }

      res.status(201).json(instance);
    } catch (error) {
      res.status(500).json({ message: "Erro ao iniciar processo" });
    }
  });

  // ===== PROCESS STEP INSTANCE ROUTES =====
  
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
          
          return {
            ...task,
            stepName: step?.name || "Etapa desconhecida",
            processName: processInstance?.name || "Processo desconhecido",
            templateName: template?.name || "Modelo desconhecido",
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

  const httpServer = createServer(app);
  return httpServer;
}
