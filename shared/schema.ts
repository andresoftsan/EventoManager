import { mysqlTable, int, varchar, text, timestamp, boolean } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const events = mysqlTable("events", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  startTime: varchar("start_time", { length: 5 }).notNull(), // HH:MM format
  endTime: varchar("end_time", { length: 5 }).notNull(), // HH:MM format
  userId: int("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
  razaoSocial: varchar("razao_social", { length: 200 }).notNull(),
  nomeFantasia: varchar("nome_fantasia", { length: 200 }),
  cnpj: varchar("cnpj", { length: 18 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull(),
  telefone: varchar("telefone", { length: 20 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const kanbanStages = mysqlTable("kanban_stages", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  order: int("order").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tasks = mysqlTable("tasks", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  clientId: int("client_id").notNull(),
  userId: int("user_id").notNull(),
  stageId: int("stage_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Schemas de inserção
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
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

// Tipos
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertKanbanStage = z.infer<typeof insertKanbanStageSchema>;
export type KanbanStage = typeof kanbanStages.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Schema de login
export const loginSchema = z.object({
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type LoginData = z.infer<typeof loginSchema>;