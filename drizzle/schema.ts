import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

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
  productionRole: varchar("productionRole", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Production roles
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
 * Checklist templates
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
 * Template items
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
 * Checklist instances
 */
export const checklistInstances = mysqlTable("checklist_instances", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  userId: int("userId").notNull(),
  dateKey: varchar("dateKey", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChecklistInstance = typeof checklistInstances.$inferSelect;

/**
 * Instance items
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

// ============================================================
// TASKS MODULE
// ============================================================

/**
 * Tasks — assigned to specific employees by managers
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  description: text("description"),
  /** User ID of the assignee */
  assigneeId: int("assigneeId").notNull(),
  /** User ID of the creator */
  creatorId: int("creatorId").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  deadline: timestamp("deadline"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;

// ============================================================
// LOOKUP LISTS MODULE (for report dropdowns)
// ============================================================

/**
 * Lookup lists — configurable dropdown options for reports
 * category: "machines", "molds", "colors", "downtime_reasons"
 */
export const lookupItems = mysqlTable("lookup_items", {
  id: int("id").autoincrement().primaryKey(),
  category: varchar("category", { length: 64 }).notNull(),
  value: varchar("value", { length: 256 }).notNull(),
  /** For molds category: links mold to its product name */
  parentProduct: varchar("parentProduct", { length: 256 }),
  /** Standard weight for product (grams), used in shift reports */
  standardWeight: decimal("standardWeight", { precision: 8, scale: 2 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LookupItem = typeof lookupItems.$inferSelect;

// ============================================================
// SHIFT REPORTS MODULE
// ============================================================

/**
 * Shift reports — one per user per shift date
 */
export const shiftReports = mysqlTable("shift_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  shiftDate: varchar("shiftDate", { length: 32 }).notNull(),
  shiftNumber: int("shiftNumber").default(1).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShiftReport = typeof shiftReports.$inferSelect;

/**
 * Shift report rows — individual production entries within a shift report
 */
export const shiftReportRows = mysqlTable("shift_report_rows", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("reportId").notNull(),
  orderId: int("orderId"),
  machineNumber: varchar("machineNumber", { length: 64 }).notNull(),
  moldProduct: varchar("moldProduct", { length: 256 }).notNull(),
  productColor: varchar("productColor", { length: 128 }).notNull(),
  planQty: int("planQty").default(0).notNull(),
  actualQty: int("actualQty").default(0).notNull(),
  standardCycle: decimal("standardCycle", { precision: 8, scale: 2 }).default("0").notNull(),
  actualCycle: decimal("actualCycle", { precision: 8, scale: 2 }).default("0").notNull(),
  /** Standard weight from lookup (grams) */
  standardWeight: decimal("standardWeight", { precision: 8, scale: 2 }),
  /** Average weight measured during production (grams) */
  avgWeight: decimal("avgWeight", { precision: 8, scale: 2 }),
  downtimeMin: int("downtimeMin").default(0).notNull(),
  downtimeReason: varchar("downtimeReason", { length: 256 }),
  defectKg: decimal("defectKg", { precision: 8, scale: 2 }).default("0").notNull(),
  changeover: int("changeover").default(0).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShiftReportRow = typeof shiftReportRows.$inferSelect;

// ============================================================
// ORDERS MODULE
// ============================================================

/**
 * Machines — 27 production machines
 */
export const machines = mysqlTable("machines", {
  id: int("id").autoincrement().primaryKey(),
  number: varchar("number", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["running", "idle", "maintenance", "changeover"]).default("idle").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Machine = typeof machines.$inferSelect;

/**
 * Orders — production orders assigned to machines
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  machineId: int("machineId").notNull(),
  product: varchar("product", { length: 256 }).notNull(),
  color: varchar("color", { length: 128 }),
  quantity: int("quantity").notNull(),
  completedQty: int("completedQty").default(0).notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  moldName: varchar("moldName", { length: 256 }),
  rawMaterial: varchar("rawMaterial", { length: 256 }),
  notes: text("notes"),
  createdById: int("createdById").notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;

// ============================================================
// RAW MATERIALS / RECIPES MODULE
// ============================================================

/**
 * Material recipes — raw material formulas for products
 */
export const materialRecipes = mysqlTable("material_recipes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  product: varchar("product", { length: 256 }).notNull(),
  description: text("description"),
  createdById: int("createdById").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaterialRecipe = typeof materialRecipes.$inferSelect;

/**
 * Recipe components — individual ingredients in a recipe
 */
export const recipeComponents = mysqlTable("recipe_components", {
  id: int("id").autoincrement().primaryKey(),
  recipeId: int("recipeId").notNull(),
  materialName: varchar("materialName", { length: 256 }).notNull(),
  percentage: decimal("percentage", { precision: 6, scale: 2 }).default("0").notNull(),
  weightKg: decimal("weightKg", { precision: 10, scale: 3 }),
  notes: text("notes"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RecipeComponent = typeof recipeComponents.$inferSelect;

// ============================================================
// MATERIAL REQUESTS MODULE (auto-created from orders)
// ============================================================

/**
 * Material requests — auto-generated when an order is created, based on recipe
 */
export const materialRequests = mysqlTable("material_requests", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  recipeId: int("recipeId"),
  product: varchar("product", { length: 256 }).notNull(),
  /** Total base weight in kg entered by user for calculation */
  baseWeightKg: decimal("baseWeightKg", { precision: 10, scale: 3 }),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaterialRequest = typeof materialRequests.$inferSelect;

/**
 * Material request items — individual components of a material request
 */
export const materialRequestItems = mysqlTable("material_request_items", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  materialName: varchar("materialName", { length: 256 }).notNull(),
  percentage: decimal("percentage", { precision: 6, scale: 2 }).default("0").notNull(),
  /** Calculated weight in kg based on percentage and base weight */
  calculatedKg: decimal("calculatedKg", { precision: 10, scale: 3 }),
  /** Actual weight used (manually entered) */
  actualKg: decimal("actualKg", { precision: 10, scale: 3 }),
  /** Raw material batch/lot number (optional) */
  batchNumber: varchar("batchNumber", { length: 256 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaterialRequestItem = typeof materialRequestItems.$inferSelect;

// ============================================================
// CUSTOM REPORT FIELDS MODULE
// ============================================================

/**
 * Custom report fields — user-defined columns for shift reports
 */
export const customReportFields = mysqlTable("custom_report_fields", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  label: varchar("label", { length: 256 }).notNull(),
  fieldType: mysqlEnum("fieldType", ["text", "number", "decimal", "boolean"]).default("text").notNull(),
  isRequired: boolean("isRequired").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomReportField = typeof customReportFields.$inferSelect;

/**
 * Custom field values — stored values for custom fields per report row
 */
export const customFieldValues = mysqlTable("custom_field_values", {
  id: int("id").autoincrement().primaryKey(),
  reportRowId: int("reportRowId").notNull(),
  fieldId: int("fieldId").notNull(),
  value: text("value"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CustomFieldValue = typeof customFieldValues.$inferSelect;

// ============================================================
// ROLE PERMISSIONS MODULE
// ============================================================

/**
 * Role permissions — controls which modules each production role can access
 * module: "checklist", "tasks", "reports", "orders", "recipes", "monitoring", "analytics", "dictionaries"
 */
export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  roleSlug: varchar("roleSlug", { length: 64 }).notNull(),
  module: varchar("module", { length: 64 }).notNull(),
  hasAccess: boolean("hasAccess").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;
