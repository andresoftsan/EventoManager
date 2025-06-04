import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import session from "express-session";

// server/storage.ts
var MemStorage = class {
  users;
  events;
  clients;
  kanbanStages;
  tasks;
  currentUserId;
  currentEventId;
  currentClientId;
  currentStageId;
  currentTaskId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.events = /* @__PURE__ */ new Map();
    this.clients = /* @__PURE__ */ new Map();
    this.kanbanStages = /* @__PURE__ */ new Map();
    this.tasks = /* @__PURE__ */ new Map();
    this.currentUserId = 1;
    this.currentEventId = 1;
    this.currentClientId = 1;
    this.currentStageId = 1;
    this.currentTaskId = 1;
    this.createMasterUser();
    this.createDefaultKanbanStages();
  }
  createMasterUser() {
    const masterUser = {
      id: this.currentUserId++,
      username: "admin",
      password: "master123",
      name: "Administrador Master",
      email: "admin@sistema.com",
      isAdmin: true,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.users.set(masterUser.id, masterUser);
  }
  createDefaultKanbanStages() {
    const defaultStages = [
      {
        id: this.currentStageId++,
        name: "A Fazer",
        order: 1,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: this.currentStageId++,
        name: "Em Progresso",
        order: 2,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: this.currentStageId++,
        name: "Em Revis\xE3o",
        order: 3,
        createdAt: /* @__PURE__ */ new Date()
      },
      {
        id: this.currentStageId++,
        name: "Conclu\xEDdo",
        order: 4,
        createdAt: /* @__PURE__ */ new Date()
      }
    ];
    defaultStages.forEach((stage) => {
      this.kanbanStages.set(stage.id, stage);
    });
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.currentUserId++;
    const user = {
      ...insertUser,
      id,
      isAdmin: insertUser.isAdmin || false,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.users.set(id, user);
    return user;
  }
  async getAllUsers() {
    return Array.from(this.users.values());
  }
  async deleteUser(id) {
    const user = this.users.get(id);
    if (user && user.username === "admin") {
      return false;
    }
    return this.users.delete(id);
  }
  // Event methods
  async getEvent(id) {
    return this.events.get(id);
  }
  async getEventsByUserId(userId) {
    return Array.from(this.events.values()).filter(
      (event) => event.userId === userId
    );
  }
  async getAllEvents() {
    return Array.from(this.events.values());
  }
  async createEvent(insertEvent) {
    const id = this.currentEventId++;
    const event = {
      ...insertEvent,
      id,
      description: insertEvent.description || null,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.events.set(id, event);
    return event;
  }
  async updateEvent(id, eventUpdate) {
    const event = this.events.get(id);
    if (!event) return void 0;
    const updatedEvent = { ...event, ...eventUpdate };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }
  async deleteEvent(id) {
    return this.events.delete(id);
  }
  // Client methods
  async getClient(id) {
    return this.clients.get(id);
  }
  async getAllClients() {
    return Array.from(this.clients.values());
  }
  async createClient(insertClient) {
    const id = this.currentClientId++;
    const client = {
      ...insertClient,
      nomeFantasia: insertClient.nomeFantasia || null,
      telefone: insertClient.telefone || null,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.clients.set(id, client);
    return client;
  }
  async updateClient(id, clientUpdate) {
    const client = this.clients.get(id);
    if (!client) return void 0;
    const updatedClient = { ...client, ...clientUpdate };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }
  async deleteClient(id) {
    return this.clients.delete(id);
  }
  // Kanban Stage methods
  async getKanbanStage(id) {
    return this.kanbanStages.get(id);
  }
  async getAllKanbanStages() {
    return Array.from(this.kanbanStages.values()).sort((a, b) => a.order - b.order);
  }
  async createKanbanStage(insertStage) {
    const id = this.currentStageId++;
    const stage = {
      ...insertStage,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.kanbanStages.set(id, stage);
    return stage;
  }
  async updateKanbanStage(id, stageUpdate) {
    const stage = this.kanbanStages.get(id);
    if (!stage) return void 0;
    const updatedStage = { ...stage, ...stageUpdate };
    this.kanbanStages.set(id, updatedStage);
    return updatedStage;
  }
  async deleteKanbanStage(id) {
    return this.kanbanStages.delete(id);
  }
  // Task methods
  async getTask(id) {
    return this.tasks.get(id);
  }
  async getTasksByUserId(userId) {
    return Array.from(this.tasks.values()).filter((task) => task.userId === userId);
  }
  async getAllTasks() {
    return Array.from(this.tasks.values());
  }
  async createTask(insertTask) {
    const id = this.currentTaskId++;
    const task = {
      ...insertTask,
      description: insertTask.description || null,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.tasks.set(id, task);
    return task;
  }
  async updateTask(id, taskUpdate) {
    const task = this.tasks.get(id);
    if (!task) return void 0;
    const updatedTask = {
      ...task,
      ...taskUpdate,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  async deleteTask(id) {
    return this.tasks.delete(id);
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  // YYYY-MM-DD format
  startTime: text("start_time").notNull(),
  // HH:MM format
  endTime: text("end_time").notNull(),
  // HH:MM format
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  razaoSocial: text("razao_social").notNull(),
  nomeFantasia: text("nome_fantasia"),
  cnpj: text("cnpj").notNull().unique(),
  email: text("email").notNull(),
  telefone: text("telefone"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var kanbanStages = pgTable("kanban_stages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  userId: integer("user_id").notNull().references(() => users.id),
  stageId: integer("stage_id").notNull().references(() => kanbanStages.id),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true
});
var insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true
});
var insertKanbanStageSchema = createInsertSchema(kanbanStages).omit({
  id: true,
  createdAt: true
});
var insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true
});
var loginSchema = z.object({
  username: z.string().min(1, "Usu\xE1rio \xE9 obrigat\xF3rio"),
  password: z.string().min(1, "Senha \xE9 obrigat\xF3ria")
});

// server/routes.ts
import { z as z2 } from "zod";
async function registerRoutes(app2) {
  app2.use(session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1e3
      // 24 hours
    }
  }));
  const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "N\xE3o autorizado" });
    }
    next();
  };
  const requireAdmin = async (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "N\xE3o autorizado" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    next();
  };
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Usu\xE1rio ou senha incorretos" });
      }
      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });
  app2.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "N\xE3o autorizado" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Usu\xE1rio n\xE3o encontrado" });
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  });
  app2.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      const usersWithoutPassword = users2.map((user) => {
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar usu\xE1rios" });
    }
  });
  app2.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Nome de usu\xE1rio j\xE1 existe" });
      }
      const user = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar usu\xE1rio" });
    }
  });
  app2.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado ou n\xE3o pode ser exclu\xEDdo" });
      }
      res.json({ message: "Usu\xE1rio exclu\xEDdo com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir usu\xE1rio" });
    }
  });
  app2.get("/api/events", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      let events2;
      if (user?.isAdmin) {
        events2 = await storage.getAllEvents();
      } else {
        events2 = await storage.getEventsByUserId(req.session.userId);
      }
      const eventsWithUserNames = await Promise.all(
        events2.map(async (event) => {
          const eventUser = await storage.getUser(event.userId);
          return {
            ...event,
            userName: eventUser?.name || "Usu\xE1rio desconhecido"
          };
        })
      );
      res.json(eventsWithUserNames);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar eventos" });
    }
  });
  app2.post("/api/events", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      let targetUserId = req.session.userId;
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
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar evento" });
    }
  });
  app2.put("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const eventData = insertEventSchema.omit({ userId: true }).parse(req.body);
      const existingEvent = await storage.getEvent(id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Evento n\xE3o encontrado" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin && existingEvent.userId !== req.session.userId) {
        return res.status(403).json({ message: "N\xE3o autorizado a editar este evento" });
      }
      const updatedEvent = await storage.updateEvent(id, eventData);
      res.json(updatedEvent);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar evento" });
    }
  });
  app2.delete("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingEvent = await storage.getEvent(id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Evento n\xE3o encontrado" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user?.isAdmin && existingEvent.userId !== req.session.userId) {
        return res.status(403).json({ message: "N\xE3o autorizado a excluir este evento" });
      }
      const success = await storage.deleteEvent(id);
      if (!success) {
        return res.status(404).json({ message: "Evento n\xE3o encontrado" });
      }
      res.json({ message: "Evento exclu\xEDdo com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir evento" });
    }
  });
  app2.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      let events2, tasks2;
      if (user?.isAdmin) {
        events2 = await storage.getAllEvents();
        tasks2 = await storage.getAllTasks();
      } else {
        events2 = await storage.getEventsByUserId(req.session.userId);
        tasks2 = await storage.getTasksByUserId(req.session.userId);
      }
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const nextWeek = /* @__PURE__ */ new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split("T")[0];
      const openTasks = await Promise.all(
        tasks2.map(async (task) => {
          const stage = await storage.getKanbanStage(task.stageId);
          return stage && stage.name?.toLowerCase() !== "conclu\xEDdo";
        })
      ).then((results) => results.filter(Boolean).length);
      const overdueTasks = await Promise.all(
        tasks2.map(async (task) => {
          const stage = await storage.getKanbanStage(task.stageId);
          const isNotCompleted = stage && stage.name?.toLowerCase() !== "conclu\xEDdo";
          const isOverdue = new Date(task.endDate) < /* @__PURE__ */ new Date();
          return isNotCompleted && isOverdue;
        })
      ).then((results) => results.filter(Boolean).length);
      const todayTasks = tasks2.filter((task) => {
        const taskEndDate = new Date(task.endDate).toISOString().split("T")[0];
        return taskEndDate === today;
      }).length;
      const stats = {
        totalEvents: events2.length,
        todayEvents: events2.filter((e) => e.date === today).length,
        nextWeekEvents: events2.filter((e) => e.date >= today && e.date <= nextWeekStr).length,
        activeUsers: user?.isAdmin ? (await storage.getAllUsers()).length : 1,
        totalTasks: tasks2.length,
        openTasks,
        overdueTasks,
        todayTasks
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar estat\xEDsticas" });
    }
  });
  app2.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const clients2 = await storage.getAllClients();
      res.json(clients2);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });
  app2.post("/api/clients", requireAuth, requireAdmin, async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar cliente" });
    }
  });
  app2.put("/api/clients/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const clientData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, clientData);
      if (!client) {
        return res.status(404).json({ message: "Cliente n\xE3o encontrado" });
      }
      res.json(client);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar cliente" });
    }
  });
  app2.delete("/api/clients/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteClient(id);
      if (!success) {
        return res.status(404).json({ message: "Cliente n\xE3o encontrado" });
      }
      res.json({ message: "Cliente exclu\xEDdo com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir cliente" });
    }
  });
  app2.get("/api/kanban-stages", requireAuth, async (req, res) => {
    try {
      const stages = await storage.getAllKanbanStages();
      res.json(stages);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar etapas do kanban" });
    }
  });
  app2.post("/api/kanban-stages", requireAuth, requireAdmin, async (req, res) => {
    try {
      const stageData = insertKanbanStageSchema.parse(req.body);
      const stage = await storage.createKanbanStage(stageData);
      res.status(201).json(stage);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar etapa do kanban" });
    }
  });
  app2.put("/api/kanban-stages/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const stageData = insertKanbanStageSchema.partial().parse(req.body);
      const stage = await storage.updateKanbanStage(id, stageData);
      if (!stage) {
        return res.status(404).json({ message: "Etapa n\xE3o encontrada" });
      }
      res.json(stage);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar etapa do kanban" });
    }
  });
  app2.delete("/api/kanban-stages/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteKanbanStage(id);
      if (!success) {
        return res.status(404).json({ message: "Etapa n\xE3o encontrada" });
      }
      res.json({ message: "Etapa exclu\xEDda com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir etapa do kanban" });
    }
  });
  app2.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      let tasks2;
      if (user?.isAdmin) {
        tasks2 = await storage.getAllTasks();
      } else {
        tasks2 = await storage.getTasksByUserId(req.session.userId);
      }
      const tasksWithDetails = await Promise.all(
        tasks2.map(async (task) => {
          const taskUser = await storage.getUser(task.userId);
          const client = await storage.getClient(task.clientId);
          const stage = await storage.getKanbanStage(task.stageId);
          return {
            ...task,
            userName: taskUser?.name || "Usu\xE1rio desconhecido",
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
  app2.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      let targetUserId = req.session.userId;
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
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar tarefa" });
    }
  });
  app2.put("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(req.session.userId);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Tarefa n\xE3o encontrada" });
      }
      if (!user?.isAdmin && task.userId !== req.session.userId) {
        return res.status(403).json({ message: "N\xE3o autorizado a atualizar esta tarefa" });
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
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ message: "Dados inv\xE1lidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar tarefa" });
    }
  });
  app2.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(req.session.userId);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Tarefa n\xE3o encontrada" });
      }
      if (!user?.isAdmin && task.userId !== req.session.userId) {
        return res.status(403).json({ message: "N\xE3o autorizado a excluir esta tarefa" });
      }
      const success = await storage.deleteTask(id);
      if (!success) {
        return res.status(404).json({ message: "Tarefa n\xE3o encontrada" });
      }
      res.json({ message: "Tarefa exclu\xEDda com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir tarefa" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    
    ...false ? [
      await null.then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
