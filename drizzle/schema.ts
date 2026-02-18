import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** Production role assigned by admin (e.g. "packer", "adjuster", "mechanic", "shift_supervisor", "production_manager") */
  productionRole: varchar("productionRole", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Production roles (e.g. Упаковщик, Наладчик, Механик, Начальник смены, Начальник производства)
 */
export const productionRoles = mysqlTable("production_roles", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductionRole = typeof productionRoles.$inferSelect;

/**
 * Checklist templates — one per role per period type (daily/weekly/monthly)
 */
export const checklistTemplates = mysqlTable("checklist_templates", {
  id: int("id").autoincrement().primaryKey(),
  roleId: int("roleId").notNull(),
  periodType: mysqlEnum("periodType", ["daily", "weekly", "monthly"]).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChecklistTemplate = typeof checklistTemplates.$inferSelect;

/**
 * Template items — individual checklist items within a template
 */
export const templateItems = mysqlTable("template_items", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  sectionTitle: varchar("sectionTitle", { length: 256 }).notNull(),
  sectionIcon: varchar("sectionIcon", { length: 64 }).default("clipboard").notNull(),
  text: text("text").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TemplateItem = typeof templateItems.$inferSelect;

/**
 * Checklist instances — a filled-in checklist for a specific user and date period
 */
export const checklistInstances = mysqlTable("checklist_instances", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  userId: int("userId").notNull(),
  /** Date key like "daily-2026-02-18", "weekly-2026-W08", "monthly-2026-02" */
  dateKey: varchar("dateKey", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChecklistInstance = typeof checklistInstances.$inferSelect;

/**
 * Instance items — individual item completions within an instance
 */
export const instanceItems = mysqlTable("instance_items", {
  id: int("id").autoincrement().primaryKey(),
  instanceId: int("instanceId").notNull(),
  templateItemId: int("templateItemId").notNull(),
  checked: boolean("checked").default(false).notNull(),
  note: text("note"),
  checkedAt: timestamp("checkedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InstanceItem = typeof instanceItems.$inferSelect;
