import { 
  users, 
  events, 
  clients, 
  kanbanStages, 
  tasks,
  type User, 
  type InsertUser, 
  type Event, 
  type InsertEvent,
  type Client,
  type InsertClient,
  type KanbanStage,
  type InsertKanbanStage,
  type Task,
  type InsertTask
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;

  // Event methods
  getEvent(id: number): Promise<Event | undefined>;
  getEventsByUserId(userId: number): Promise<Event[]>;
  getAllEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;

  // Client methods
  getClient(id: number): Promise<Client | undefined>;
  getAllClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;

  // Kanban Stage methods
  getKanbanStage(id: number): Promise<KanbanStage | undefined>;
  getAllKanbanStages(): Promise<KanbanStage[]>;
  createKanbanStage(stage: InsertKanbanStage): Promise<KanbanStage>;
  updateKanbanStage(id: number, stage: Partial<InsertKanbanStage>): Promise<KanbanStage | undefined>;
  deleteKanbanStage(id: number): Promise<boolean>;

  // Task methods
  getTask(id: number): Promise<Task | undefined>;
  getTasksByUserId(userId: number): Promise<Task[]>;
  getAllTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private events: Map<number, Event>;
  private clients: Map<number, Client>;
  private kanbanStages: Map<number, KanbanStage>;
  private tasks: Map<number, Task>;
  private currentUserId: number;
  private currentEventId: number;
  private currentClientId: number;
  private currentStageId: number;
  private currentTaskId: number;

  constructor() {
    this.users = new Map();
    this.events = new Map();
    this.clients = new Map();
    this.kanbanStages = new Map();
    this.tasks = new Map();
    this.currentUserId = 1;
    this.currentEventId = 1;
    this.currentClientId = 1;
    this.currentStageId = 1;
    this.currentTaskId = 1;

    // Create master admin user
    this.createMasterUser();
    this.createDefaultKanbanStages();
  }

  private createMasterUser(): void {
    const masterUser: User = {
      id: this.currentUserId++,
      username: "admin",
      password: "master123",
      name: "Administrador Master",
      email: "admin@sistema.com",
      isAdmin: true,
      createdAt: new Date(),
    };
    this.users.set(masterUser.id, masterUser);
  }

  private createDefaultKanbanStages(): void {
    const defaultStages: KanbanStage[] = [
      {
        id: this.currentStageId++,
        name: "A Fazer",
        order: 1,
        createdAt: new Date(),
      },
      {
        id: this.currentStageId++,
        name: "Em Progresso",
        order: 2,
        createdAt: new Date(),
      },
      {
        id: this.currentStageId++,
        name: "Em Revisão",
        order: 3,
        createdAt: new Date(),
      },
      {
        id: this.currentStageId++,
        name: "Concluído",
        order: 4,
        createdAt: new Date(),
      }
    ];

    defaultStages.forEach(stage => {
      this.kanbanStages.set(stage.id, stage);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      isAdmin: insertUser.isAdmin || false,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async deleteUser(id: number): Promise<boolean> {
    // Don't allow deleting the master admin user
    const user = this.users.get(id);
    if (user && user.username === "admin") {
      return false;
    }
    return this.users.delete(id);
  }

  // Event methods
  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getEventsByUserId(userId: number): Promise<Event[]> {
    return Array.from(this.events.values()).filter(
      (event) => event.userId === userId,
    );
  }

  async getAllEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = this.currentEventId++;
    const event: Event = { 
      ...insertEvent, 
      id,
      description: insertEvent.description || null,
      createdAt: new Date(),
    };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: number, eventUpdate: Partial<InsertEvent>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;

    const updatedEvent: Event = { ...event, ...eventUpdate };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }

  // Client methods
  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getAllClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.currentClientId++;
    const client: Client = { 
      ...insertClient,
      nomeFantasia: insertClient.nomeFantasia || null,
      telefone: insertClient.telefone || null,
      id, 
      createdAt: new Date(),
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: number, clientUpdate: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;

    const updatedClient: Client = { ...client, ...clientUpdate };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    return this.clients.delete(id);
  }

  // Kanban Stage methods
  async getKanbanStage(id: number): Promise<KanbanStage | undefined> {
    return this.kanbanStages.get(id);
  }

  async getAllKanbanStages(): Promise<KanbanStage[]> {
    return Array.from(this.kanbanStages.values()).sort((a, b) => a.order - b.order);
  }

  async createKanbanStage(insertStage: InsertKanbanStage): Promise<KanbanStage> {
    const id = this.currentStageId++;
    const stage: KanbanStage = { 
      ...insertStage, 
      id, 
      createdAt: new Date(),
    };
    this.kanbanStages.set(id, stage);
    return stage;
  }

  async updateKanbanStage(id: number, stageUpdate: Partial<InsertKanbanStage>): Promise<KanbanStage | undefined> {
    const stage = this.kanbanStages.get(id);
    if (!stage) return undefined;

    const updatedStage: KanbanStage = { ...stage, ...stageUpdate };
    this.kanbanStages.set(id, updatedStage);
    return updatedStage;
  }

  async deleteKanbanStage(id: number): Promise<boolean> {
    return this.kanbanStages.delete(id);
  }

  // Task methods
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByUserId(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.userId === userId);
  }

  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskId++;
    const task: Task = { 
      ...insertTask,
      description: insertTask.description || null,
      id, 
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, taskUpdate: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    const updatedTask: Task = { 
      ...task, 
      ...taskUpdate, 
      updatedAt: new Date(),
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }
}

export const storage = new MemStorage();
