import { 
  users, 
  events, 
  clients, 
  companies,
  kanbanStages, 
  tasks,
  checklistItems,
  processTemplates,
  processSteps,
  processInstances,
  processStepInstances,
  type User, 
  type InsertUser, 
  type Event, 
  type InsertEvent,
  type Client,
  type InsertClient,
  type Company,
  type InsertCompany,
  type KanbanStage,
  type InsertKanbanStage,
  type Task,
  type InsertTask,
  type ChecklistItem,
  type InsertChecklistItem,
  type ProcessTemplate,
  type InsertProcessTemplate,
  type ProcessStep,
  type InsertProcessStep,
  type ProcessInstance,
  type InsertProcessInstance,
  type ProcessStepInstance,
  type InsertProcessStepInstance
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
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

  // Company methods
  getCompany(id: number): Promise<Company | undefined>;
  getAllCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<boolean>;

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

  // Checklist methods
  getChecklistItemsByTaskId(taskId: number): Promise<ChecklistItem[]>;
  createChecklistItem(item: InsertChecklistItem): Promise<ChecklistItem>;
  updateChecklistItem(id: number, item: Partial<InsertChecklistItem>): Promise<ChecklistItem | undefined>;
  deleteChecklistItem(id: number): Promise<boolean>;

  // Process Template methods
  getProcessTemplate(id: number): Promise<ProcessTemplate | undefined>;
  getAllProcessTemplates(): Promise<ProcessTemplate[]>;
  createProcessTemplate(template: InsertProcessTemplate): Promise<ProcessTemplate>;
  updateProcessTemplate(id: number, template: Partial<InsertProcessTemplate>): Promise<ProcessTemplate | undefined>;
  deleteProcessTemplate(id: number): Promise<boolean>;

  // Process Step methods
  getProcessStep(id: number): Promise<ProcessStep | undefined>;
  getProcessStepsByTemplateId(templateId: number): Promise<ProcessStep[]>;
  createProcessStep(step: InsertProcessStep): Promise<ProcessStep>;
  updateProcessStep(id: number, step: Partial<InsertProcessStep>): Promise<ProcessStep | undefined>;
  deleteProcessStep(id: number): Promise<boolean>;

  // Process Instance methods
  getProcessInstance(id: number): Promise<ProcessInstance | undefined>;
  getProcessInstanceByNumber(processNumber: string): Promise<ProcessInstance | undefined>;
  getAllProcessInstances(): Promise<ProcessInstance[]>;
  getProcessInstancesByUserId(userId: number): Promise<ProcessInstance[]>;
  createProcessInstance(instance: InsertProcessInstance): Promise<ProcessInstance>;
  updateProcessInstance(id: number, instance: Partial<InsertProcessInstance>): Promise<ProcessInstance | undefined>;
  deleteProcessInstance(id: number): Promise<boolean>;

  // Process Step Instance methods
  getProcessStepInstance(id: number): Promise<ProcessStepInstance | undefined>;
  getProcessStepInstancesByProcessId(processId: number): Promise<ProcessStepInstance[]>;
  getProcessStepInstancesByUserId(userId: number): Promise<ProcessStepInstance[]>;
  createProcessStepInstance(stepInstance: InsertProcessStepInstance): Promise<ProcessStepInstance>;
  updateProcessStepInstance(id: number, stepInstance: Partial<InsertProcessStepInstance>): Promise<ProcessStepInstance | undefined>;
  deleteProcessStepInstance(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private events: Map<number, Event>;
  private clients: Map<number, Client>;
  private companies: Map<number, Company>;
  private kanbanStages: Map<number, KanbanStage>;
  private tasks: Map<number, Task>;
  private checklistItems: Map<number, ChecklistItem>;
  private processTemplates: Map<number, ProcessTemplate>;
  private processSteps: Map<number, ProcessStep>;
  private processInstances: Map<number, ProcessInstance>;
  private processStepInstances: Map<number, ProcessStepInstance>;
  private currentUserId: number;
  private currentEventId: number;
  private currentClientId: number;
  private currentCompanyId: number;
  private currentStageId: number;
  private currentTaskId: number;
  private currentChecklistItemId: number;
  private currentProcessTemplateId: number;
  private currentProcessStepId: number;
  private currentProcessInstanceId: number;
  private processCounter: number;
  private currentProcessStepInstanceId: number;

  constructor() {
    this.users = new Map();
    this.events = new Map();
    this.clients = new Map();
    this.companies = new Map();
    this.kanbanStages = new Map();
    this.tasks = new Map();
    this.checklistItems = new Map();
    this.processTemplates = new Map();
    this.processSteps = new Map();
    this.processInstances = new Map();
    this.processStepInstances = new Map();
    this.currentUserId = 1;
    this.currentEventId = 1;
    this.currentClientId = 1;
    this.currentCompanyId = 1;
    this.currentStageId = 1;
    this.currentTaskId = 1;
    this.currentChecklistItemId = 1;
    this.currentProcessTemplateId = 1;
    this.currentProcessStepId = 1;
    this.currentProcessInstanceId = 1;
    this.currentProcessStepInstanceId = 1;
    this.processCounter = 1;

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
      companyIds: [],
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
      companyIds: insertUser.companyIds || [],
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userUpdate: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = { 
      ...user, 
      ...userUpdate,
      companyIds: userUpdate.companyIds || user.companyIds || [],
    };
    this.users.set(id, updatedUser);
    return updatedUser;
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

  // Company methods
  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async getAllCompanies(): Promise<Company[]> {
    return Array.from(this.companies.values());
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = this.currentCompanyId++;
    const company: Company = { 
      ...insertCompany,
      id, 
      createdAt: new Date(),
    };
    this.companies.set(id, company);
    return company;
  }

  async updateCompany(id: number, companyUpdate: Partial<InsertCompany>): Promise<Company | undefined> {
    const company = this.companies.get(id);
    if (!company) return undefined;

    const updatedCompany: Company = { ...company, ...companyUpdate };
    this.companies.set(id, updatedCompany);
    return updatedCompany;
  }

  async deleteCompany(id: number): Promise<boolean> {
    return this.companies.delete(id);
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
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    // Delete associated checklist items first
    const checklistItems = Array.from(this.checklistItems.values()).filter(item => item.taskId === id);
    checklistItems.forEach(item => this.checklistItems.delete(item.id));
    
    return this.tasks.delete(id);
  }

  // Checklist methods
  async getChecklistItemsByTaskId(taskId: number): Promise<ChecklistItem[]> {
    return Array.from(this.checklistItems.values())
      .filter(item => item.taskId === taskId)
      .sort((a, b) => a.order - b.order);
  }

  async createChecklistItem(insertItem: InsertChecklistItem): Promise<ChecklistItem> {
    const id = this.currentChecklistItemId++;
    const item: ChecklistItem = {
      ...insertItem,
      id,
      order: insertItem.order || 0,
      completed: insertItem.completed || false,
      createdAt: new Date(),
    };
    this.checklistItems.set(id, item);
    return item;
  }

  async updateChecklistItem(id: number, itemUpdate: Partial<InsertChecklistItem>): Promise<ChecklistItem | undefined> {
    const item = this.checklistItems.get(id);
    if (!item) return undefined;

    const updatedItem: ChecklistItem = {
      ...item,
      ...itemUpdate,
    };
    this.checklistItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteChecklistItem(id: number): Promise<boolean> {
    return this.checklistItems.delete(id);
  }

  // ===== PROCESS TEMPLATE METHODS =====
  async getProcessTemplate(id: number): Promise<ProcessTemplate | undefined> {
    return this.processTemplates.get(id);
  }

  async getAllProcessTemplates(): Promise<ProcessTemplate[]> {
    return Array.from(this.processTemplates.values());
  }

  async createProcessTemplate(insertTemplate: InsertProcessTemplate): Promise<ProcessTemplate> {
    const template: ProcessTemplate = {
      id: this.currentProcessTemplateId++,
      ...insertTemplate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.processTemplates.set(template.id, template);
    return template;
  }

  async updateProcessTemplate(id: number, templateUpdate: Partial<InsertProcessTemplate>): Promise<ProcessTemplate | undefined> {
    const template = this.processTemplates.get(id);
    if (!template) return undefined;

    const updatedTemplate: ProcessTemplate = { 
      ...template, 
      ...templateUpdate,
      updatedAt: new Date().toISOString(),
    };
    this.processTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteProcessTemplate(id: number): Promise<boolean> {
    return this.processTemplates.delete(id);
  }

  // ===== PROCESS STEP METHODS =====
  async getProcessStep(id: number): Promise<ProcessStep | undefined> {
    return this.processSteps.get(id);
  }

  async getProcessStepsByTemplateId(templateId: number): Promise<ProcessStep[]> {
    return Array.from(this.processSteps.values()).filter(step => step.templateId === templateId);
  }

  async createProcessStep(insertStep: InsertProcessStep): Promise<ProcessStep> {
    const step: ProcessStep = {
      id: this.currentProcessStepId++,
      ...insertStep,
      createdAt: new Date().toISOString(),
    };
    this.processSteps.set(step.id, step);
    return step;
  }

  async updateProcessStep(id: number, stepUpdate: Partial<InsertProcessStep>): Promise<ProcessStep | undefined> {
    const step = this.processSteps.get(id);
    if (!step) return undefined;

    const updatedStep: ProcessStep = { ...step, ...stepUpdate };
    this.processSteps.set(id, updatedStep);
    return updatedStep;
  }

  async deleteProcessStep(id: number): Promise<boolean> {
    return this.processSteps.delete(id);
  }

  // ===== PROCESS INSTANCE METHODS =====
  async getProcessInstance(id: number): Promise<ProcessInstance | undefined> {
    return this.processInstances.get(id);
  }

  async getAllProcessInstances(): Promise<ProcessInstance[]> {
    return Array.from(this.processInstances.values());
  }

  async getProcessInstanceByNumber(processNumber: string): Promise<ProcessInstance | undefined> {
    return Array.from(this.processInstances.values()).find(instance => instance.processNumber === processNumber);
  }

  async getProcessInstancesByUserId(userId: number): Promise<ProcessInstance[]> {
    return Array.from(this.processInstances.values()).filter(instance => instance.startedBy === userId);
  }

  async createProcessInstance(insertInstance: InsertProcessInstance): Promise<ProcessInstance> {
    // Generate unique process number
    const currentYear = new Date().getFullYear();
    const processNumber = `PROC-${currentYear}-${String(this.processCounter).padStart(6, '0')}`;
    
    const instance: ProcessInstance = {
      id: this.currentProcessInstanceId++,
      processNumber,
      templateId: insertInstance.templateId,
      clientId: insertInstance.clientId,
      name: insertInstance.name,
      status: insertInstance.status || "active",
      startedBy: insertInstance.startedBy,
      currentStepId: insertInstance.currentStepId,
      startedAt: new Date().toISOString(),
      completedAt: insertInstance.completedAt,
    };
    
    this.processInstances.set(instance.id, instance);
    this.processCounter++;
    return instance;
  }

  async updateProcessInstance(id: number, instanceUpdate: Partial<InsertProcessInstance>): Promise<ProcessInstance | undefined> {
    const instance = this.processInstances.get(id);
    if (!instance) return undefined;

    const updatedInstance: ProcessInstance = { ...instance, ...instanceUpdate };
    this.processInstances.set(id, updatedInstance);
    return updatedInstance;
  }

  async deleteProcessInstance(id: number): Promise<boolean> {
    return this.processInstances.delete(id);
  }

  // ===== PROCESS STEP INSTANCE METHODS =====
  async getProcessStepInstance(id: number): Promise<ProcessStepInstance | undefined> {
    return this.processStepInstances.get(id);
  }

  async getProcessStepInstancesByProcessId(processId: number): Promise<ProcessStepInstance[]> {
    return Array.from(this.processStepInstances.values()).filter(stepInstance => stepInstance.processInstanceId === processId);
  }

  async getProcessStepInstancesByUserId(userId: number): Promise<ProcessStepInstance[]> {
    return Array.from(this.processStepInstances.values()).filter(stepInstance => stepInstance.assignedUserId === userId);
  }

  async createProcessStepInstance(insertStepInstance: InsertProcessStepInstance): Promise<ProcessStepInstance> {
    const stepInstance: ProcessStepInstance = {
      id: this.currentProcessStepInstanceId++,
      ...insertStepInstance,
      startedAt: null,
      completedAt: null,
    };
    this.processStepInstances.set(stepInstance.id, stepInstance);
    return stepInstance;
  }

  async updateProcessStepInstance(id: number, stepInstanceUpdate: Partial<InsertProcessStepInstance>): Promise<ProcessStepInstance | undefined> {
    const stepInstance = this.processStepInstances.get(id);
    if (!stepInstance) return undefined;

    const updatedStepInstance: ProcessStepInstance = { 
      ...stepInstance, 
      ...stepInstanceUpdate,
      // Preserve existing timestamps if not being updated
      startedAt: stepInstanceUpdate.startedAt || stepInstance.startedAt,
      completedAt: stepInstanceUpdate.completedAt || stepInstance.completedAt,
    };
    this.processStepInstances.set(id, updatedStepInstance);
    return updatedStepInstance;
  }

  async deleteProcessStepInstance(id: number): Promise<boolean> {
    return this.processStepInstances.delete(id);
  }
}

export const storage = new MemStorage();
