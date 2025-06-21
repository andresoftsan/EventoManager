import { pgTable, text, serial, integer, boolean, timestamp, date, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  companyIds: integer("company_ids").array().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(), // YYYY-MM-DD format
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  razaoSocial: text("razao_social").notNull(),
  nomeFantasia: text("nome_fantasia"),
  cnpj: text("cnpj").notNull().unique(),
  email: text("email").notNull(),
  telefone: text("telefone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cnpj: text("cnpj").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const kanbanStages = pgTable("kanban_stages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  userId: integer("user_id").notNull().references(() => users.id),
  stageId: integer("stage_id").notNull().references(() => kanbanStages.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const checklistItems = pgTable("checklist_items", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  completed: boolean("completed").notNull().default(false),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Process Templates
export const processTemplates = pgTable("process_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Process Steps (template steps)
export const processSteps = pgTable("process_steps", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => processTemplates.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull(),
  responsibleUserId: integer("responsible_user_id").notNull().references(() => users.id),
  formFields: json("form_fields").notNull().default([]), // Array of form field definitions
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Process Instances (actual running processes)
export const processInstances = pgTable("process_instances", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => processTemplates.id),
  clientId: integer("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"), // active, completed, cancelled
  currentStepId: integer("current_step_id").references(() => processSteps.id),
  startedBy: integer("started_by").notNull().references(() => users.id),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Process Step Instances (actual step executions)
export const processStepInstances = pgTable("process_step_instances", {
  id: serial("id").primaryKey(),
  processInstanceId: integer("process_instance_id").notNull().references(() => processInstances.id, { onDelete: "cascade" }),
  stepId: integer("step_id").notNull().references(() => processSteps.id),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, skipped
  assignedUserId: integer("assigned_user_id").notNull().references(() => users.id),
  formData: json("form_data").default({}), // Submitted form data
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

// Schemas de inserção
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  companyIds: z.array(z.number()).min(1, "Pelo menos uma empresa deve ser selecionada"),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});

export const insertKanbanStageSchema = createInsertSchema(kanbanStages).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
});

export const insertChecklistItemSchema = createInsertSchema(checklistItems).omit({
  id: true,
  createdAt: true,
});

export const insertProcessTemplateSchema = createInsertSchema(processTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProcessStepSchema = createInsertSchema(processSteps).omit({
  id: true,
  createdAt: true,
});

export const insertProcessInstanceSchema = createInsertSchema(processInstances).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export const insertProcessStepInstanceSchema = createInsertSchema(processStepInstances).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

// Tipos
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;
export type InsertKanbanStage = z.infer<typeof insertKanbanStageSchema>;
export type KanbanStage = typeof kanbanStages.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;
export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertProcessTemplate = z.infer<typeof insertProcessTemplateSchema>;
export type ProcessTemplate = typeof processTemplates.$inferSelect;
export type InsertProcessStep = z.infer<typeof insertProcessStepSchema>;
export type ProcessStep = typeof processSteps.$inferSelect;
export type InsertProcessInstance = z.infer<typeof insertProcessInstanceSchema>;
export type ProcessInstance = typeof processInstances.$inferSelect;
export type InsertProcessStepInstance = z.infer<typeof insertProcessStepInstanceSchema>;
export type ProcessStepInstance = typeof processStepInstances.$inferSelect;

// Schema de login
export const loginSchema = z.object({
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type LoginData = z.infer<typeof loginSchema>;