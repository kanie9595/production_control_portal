import { eq, and, asc, desc, sql, like, inArray, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  productionRoles,
  checklistTemplates,
  templateItems,
  checklistInstances,
  instanceItems,
  tasks,
  lookupItems,
  shiftReports,
  shiftReportRows,
  machines,
  orders,
  materialRecipes,
  recipeComponents,
  rolePermissions,
  materialRequests,
  materialRequestItems,
  customReportFields,
  customFieldValues,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER HELPERS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; } else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(asc(users.name));
}

export async function setUserProductionRole(userId: number, productionRoleSlug: string | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ productionRole: productionRoleSlug }).where(eq(users.id, userId));
}

// ============ PRODUCTION ROLES ============

export async function getAllProductionRoles() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(productionRoles).orderBy(asc(productionRoles.sortOrder));
}

export async function createProductionRole(data: { slug: string; name: string; description?: string; sortOrder?: number }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(productionRoles).values({ slug: data.slug, name: data.name, description: data.description ?? null, sortOrder: data.sortOrder ?? 0 });
  return result[0].insertId;
}

export async function updateProductionRole(id: number, data: { name?: string; description?: string | null; sortOrder?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.update(productionRoles).set(data).where(eq(productionRoles.id, id));
}

// ============ CHECKLIST TEMPLATES ============

export async function getTemplatesForRole(roleId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(checklistTemplates).where(eq(checklistTemplates.roleId, roleId)).orderBy(asc(checklistTemplates.periodType));
}

export async function getAllTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(checklistTemplates).orderBy(asc(checklistTemplates.id));
}

export async function createTemplate(data: { roleId: number; periodType: "daily" | "weekly" | "monthly"; title: string }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(checklistTemplates).values(data);
  return result[0].insertId;
}

export async function updateTemplate(id: number, data: { title?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(checklistTemplates).set(data).where(eq(checklistTemplates.id, id));
}

// ============ TEMPLATE ITEMS ============

export async function getTemplateItems(templateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(templateItems).where(eq(templateItems.templateId, templateId)).orderBy(asc(templateItems.sortOrder));
}

export async function createTemplateItem(data: { templateId: number; sectionTitle: string; sectionIcon?: string; text: string; sortOrder?: number }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(templateItems).values({ templateId: data.templateId, sectionTitle: data.sectionTitle, sectionIcon: data.sectionIcon ?? "clipboard", text: data.text, sortOrder: data.sortOrder ?? 0 });
  return result[0].insertId;
}

export async function updateTemplateItem(id: number, data: { text?: string; sectionTitle?: string; sectionIcon?: string; sortOrder?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.update(templateItems).set(data).where(eq(templateItems.id, id));
}

export async function deleteTemplateItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(templateItems).where(eq(templateItems.id, id));
}

export async function getAllTemplateItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(templateItems).orderBy(asc(templateItems.sortOrder));
}

// ============ CHECKLIST INSTANCES ============

export async function getOrCreateInstance(templateId: number, userId: number, dateKey: string) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db.select().from(checklistInstances)
    .where(and(eq(checklistInstances.templateId, templateId), eq(checklistInstances.userId, userId), eq(checklistInstances.dateKey, dateKey))).limit(1);
  if (existing.length > 0) return existing[0];
  const result = await db.insert(checklistInstances).values({ templateId, userId, dateKey });
  const newId = result[0].insertId;
  const items = await getTemplateItems(templateId);
  if (items.length > 0) {
    await db.insert(instanceItems).values(items.map((item) => ({ instanceId: newId, templateItemId: item.id, checked: false, note: null })));
  }
  const created = await db.select().from(checklistInstances).where(eq(checklistInstances.id, newId)).limit(1);
  return created[0] ?? null;
}

export async function getInstanceItems(instanceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(instanceItems).where(eq(instanceItems.instanceId, instanceId)).orderBy(asc(instanceItems.id));
}

export async function toggleInstanceItem(itemId: number, checked: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(instanceItems).set({ checked, checkedAt: checked ? new Date() : null }).where(eq(instanceItems.id, itemId));
}

export async function setInstanceItemNote(itemId: number, note: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(instanceItems).set({ note }).where(eq(instanceItems.id, itemId));
}

export async function getAllInstancesForPeriod(periodType: string) {
  const db = await getDb();
  if (!db) return [];
  const dateKey = buildCurrentDateKey(periodType);
  return db.select().from(checklistInstances).where(eq(checklistInstances.dateKey, dateKey));
}

function buildCurrentDateKey(periodType: string): string {
  const now = new Date();
  if (periodType === "daily") {
    return `daily-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  if (periodType === "weekly") {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `weekly-${now.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
  }
  return `monthly-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ============ ANALYTICS ============

export async function getChecklistHistory(filters: { userId?: number; roleSlug?: string; dateFrom?: string; dateTo?: string }) {
  const db = await getDb();
  if (!db) return [];
  const allInstances = await db.select().from(checklistInstances).orderBy(desc(checklistInstances.createdAt));
  const allUsers = await db.select().from(users);
  const allTemplates = await db.select().from(checklistTemplates);
  const allRoles = await db.select().from(productionRoles);
  const allTplItems = await db.select().from(templateItems);

  const results = [];
  for (const inst of allInstances) {
    const user = allUsers.find(u => u.id === inst.userId);
    if (filters.userId && inst.userId !== filters.userId) continue;
    if (filters.roleSlug && user?.productionRole !== filters.roleSlug) continue;
    if (filters.dateFrom && inst.dateKey < filters.dateFrom) continue;
    if (filters.dateTo && inst.dateKey > filters.dateTo) continue;

    const items = await getInstanceItems(inst.id);
    const template = allTemplates.find(t => t.id === inst.templateId);
    const role = template ? allRoles.find(r => r.id === template.roleId) : null;
    const total = items.length;
    const completed = items.filter(i => i.checked).length;

    const enrichedItems = items.map(ii => {
      const ti = allTplItems.find(t => t.id === ii.templateItemId);
      return { ...ii, text: ti?.text ?? `Пункт #${ii.templateItemId}`, sectionTitle: ti?.sectionTitle ?? "" };
    });

    results.push({
      instanceId: inst.id,
      userId: inst.userId,
      userName: user?.name ?? "Неизвестный",
      roleName: role?.name ?? "Без роли",
      roleSlug: role?.slug ?? "",
      templateTitle: template?.title ?? "",
      periodType: template?.periodType ?? "daily",
      dateKey: inst.dateKey,
      total,
      completed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      items: enrichedItems,
      createdAt: inst.createdAt,
      updatedAt: inst.updatedAt,
    });
  }
  return results;
}

// ============ TASKS ============

export async function createTask(data: { title: string; description?: string; assigneeId: number; creatorId: number; priority?: "low" | "medium" | "high" | "urgent"; deadline?: Date }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(tasks).values({
    title: data.title,
    description: data.description ?? null,
    assigneeId: data.assigneeId,
    creatorId: data.creatorId,
    priority: data.priority ?? "medium",
    deadline: data.deadline ?? null,
  });
  return result[0].insertId;
}

export async function getAllTasks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).orderBy(desc(tasks.createdAt));
}

export async function getTasksForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.assigneeId, userId)).orderBy(desc(tasks.createdAt));
}

export async function updateTaskStatus(taskId: number, status: "pending" | "in_progress" | "completed" | "cancelled") {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { status };
  if (status === "completed") updateData.completedAt = new Date();
  await db.update(tasks).set(updateData).where(eq(tasks.id, taskId));
}

export async function updateTask(taskId: number, data: { title?: string; description?: string; priority?: "low" | "medium" | "high" | "urgent"; deadline?: Date | null; assigneeId?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set(data).where(eq(tasks.id, taskId));
}

// ============ LOOKUP ITEMS ============

export async function getLookupsByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lookupItems).where(and(eq(lookupItems.category, category), eq(lookupItems.isActive, true))).orderBy(asc(lookupItems.sortOrder));
}

export async function getAllLookups() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lookupItems).orderBy(asc(lookupItems.category), asc(lookupItems.sortOrder));
}

export async function createLookupItem(data: { category: string; value: string; parentProduct?: string; sortOrder?: number }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(lookupItems).values({ category: data.category, value: data.value, parentProduct: data.parentProduct ?? null, sortOrder: data.sortOrder ?? 0 });
  return result[0].insertId;
}

export async function updateLookupItem(id: number, data: { value?: string; parentProduct?: string | null; sortOrder?: number; isActive?: boolean }) {
  const db = await getDb();
  if (!db) return;
  await db.update(lookupItems).set(data).where(eq(lookupItems.id, id));
}

export async function getMoldsForProduct(productName: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lookupItems)
    .where(and(eq(lookupItems.category, "molds"), eq(lookupItems.parentProduct, productName), eq(lookupItems.isActive, true)))
    .orderBy(asc(lookupItems.sortOrder));
}

export async function deleteLookupItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(lookupItems).where(eq(lookupItems.id, id));
}

// ============ SHIFT REPORTS ============

export async function createShiftReport(data: { userId: number; shiftDate: string; shiftNumber: number; notes?: string }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(shiftReports).values({ userId: data.userId, shiftDate: data.shiftDate, shiftNumber: data.shiftNumber, notes: data.notes ?? null });
  return result[0].insertId;
}

export async function getAllShiftReports() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shiftReports).orderBy(desc(shiftReports.shiftDate));
}

export async function getShiftReportById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(shiftReports).where(eq(shiftReports.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getShiftReportRows(reportId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shiftReportRows).where(eq(shiftReportRows.reportId, reportId)).orderBy(asc(shiftReportRows.sortOrder));
}

export async function createShiftReportRow(data: {
  reportId: number; orderId?: number; machineNumber: string; moldProduct: string; productColor: string;
  planQty: number; actualQty: number; standardCycle: string; actualCycle: string;
  standardWeight?: string; avgWeight?: string;
  downtimeMin: number; downtimeReason?: string; defectKg: string; changeover: number; sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) return null;
  // Convert empty strings to "0" for decimal fields to prevent MySQL insert errors
  const safeDecimal = (v: string) => (v === "" || v == null) ? "0" : v;
  const safeDecimalNullable = (v?: string) => (!v || v === "") ? null : v;
  const result = await db.insert(shiftReportRows).values({
    reportId: data.reportId, orderId: data.orderId ?? null, machineNumber: data.machineNumber, moldProduct: data.moldProduct, productColor: data.productColor,
    planQty: data.planQty ?? 0, actualQty: data.actualQty ?? 0, standardCycle: safeDecimal(data.standardCycle), actualCycle: safeDecimal(data.actualCycle),
    standardWeight: safeDecimalNullable(data.standardWeight), avgWeight: safeDecimalNullable(data.avgWeight),
    downtimeMin: data.downtimeMin ?? 0, downtimeReason: data.downtimeReason ?? null, defectKg: safeDecimal(data.defectKg), changeover: data.changeover ?? 0, sortOrder: data.sortOrder ?? 0,
  });
  return result[0].insertId;
}

export async function updateShiftReportRow(id: number, data: Partial<{
  machineNumber: string; moldProduct: string; productColor: string;
  planQty: number; actualQty: number; standardCycle: string; actualCycle: string;
  downtimeMin: number; downtimeReason: string | null; defectKg: string; changeover: number;
  orderId: number | null;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(shiftReportRows).set(data).where(eq(shiftReportRows.id, id));
}

export async function deleteShiftReportRow(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(shiftReportRows).where(eq(shiftReportRows.id, id));
}

export async function deleteShiftReport(id: number) {
  const db = await getDb();
  if (!db) return;
  // First reverse all order deductions for rows in this report
  const rows = await getShiftReportRows(id);
  for (const row of rows) {
    if (row.orderId && row.actualQty > 0) {
      await decrementOrderCompletedQty(row.orderId, row.actualQty);
    }
  }
  // Delete all rows then the report
  await db.delete(shiftReportRows).where(eq(shiftReportRows.reportId, id));
  await db.delete(shiftReports).where(eq(shiftReports.id, id));
}

export async function getReportAnalytics(moldProduct: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shiftReportRows).where(eq(shiftReportRows.moldProduct, moldProduct)).orderBy(desc(shiftReportRows.createdAt));
}

export async function getOrderById(orderId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return result[0] ?? null;
}

export async function incrementOrderCompletedQty(orderId: number, amount: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ completedQty: sql`${orders.completedQty} + ${amount}` }).where(eq(orders.id, orderId));
}

export async function decrementOrderCompletedQty(orderId: number, amount: number) {
  const db = await getDb();
  if (!db) return;
  // Ensure completedQty doesn't go below 0
  await db.update(orders).set({ completedQty: sql`GREATEST(0, ${orders.completedQty} - ${amount})` }).where(eq(orders.id, orderId));
}

export async function getShiftReportRowById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(shiftReportRows).where(eq(shiftReportRows.id, id)).limit(1);
  return result[0] ?? null;
}

// ============ MACHINES ============

export async function getAllMachines() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(machines).orderBy(asc(machines.number));
}

export async function createMachine(data: { number: string; name: string }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(machines).values({ number: data.number, name: data.name });
  return result[0].insertId;
}

export async function updateMachineStatus(id: number, status: "running" | "idle" | "maintenance" | "changeover") {
  const db = await getDb();
  if (!db) return;
  await db.update(machines).set({ status }).where(eq(machines.id, id));
}

export async function getMachineBoard() {
  const db = await getDb();
  if (!db) return [];

  const [allMachines, allOrders] = await Promise.all([
    db.select().from(machines).orderBy(asc(machines.number)),
    db.select().from(orders).orderBy(desc(orders.createdAt)),
  ]);

  return allMachines.map((machine) => {
    const machineOrders = allOrders.filter((order) => order.machineId === machine.id);
    const activeOrder = machineOrders.find((order) => order.status === "in_progress") ?? null;
    const queue = machineOrders.filter((order) => order.status === "pending");
    const utilization = activeOrder && activeOrder.quantity > 0
      ? Math.min(100, Math.round((activeOrder.completedQty / activeOrder.quantity) * 100))
      : 0;

    return {
      ...machine,
      activeOrder,
      queue,
      queueSize: queue.length,
      utilization,
    };
  });
}

// ============ ORDERS ============

export async function createOrder(data: {
  machineId: number; product: string; color?: string; quantity: number;
  moldName?: string; rawMaterial?: string; notes?: string; createdById: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(orders).values({
    machineId: data.machineId, product: data.product, color: data.color ?? null, quantity: data.quantity,
    moldName: data.moldName ?? null, rawMaterial: data.rawMaterial ?? null, notes: data.notes ?? null, createdById: data.createdById,
  });
  return result[0].insertId;
}

export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getOrdersForMachine(machineId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.machineId, machineId)).orderBy(desc(orders.createdAt));
}

export async function getActiveOrderForMachine(machineId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(orders)
    .where(and(eq(orders.machineId, machineId), eq(orders.status, "in_progress")))
    .orderBy(desc(orders.createdAt)).limit(1);
  return result[0] ?? null;
}

export async function updateOrderStatus(orderId: number, status: "pending" | "in_progress" | "completed" | "cancelled") {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { status };
  if (status === "in_progress") updateData.startedAt = new Date();
  if (status === "completed") updateData.completedAt = new Date();
  await db.update(orders).set(updateData).where(eq(orders.id, orderId));
}

export async function updateOrder(orderId: number, data: Partial<{ product: string; color: string; quantity: number; completedQty: number; moldName: string; rawMaterial: string; notes: string }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set(data).where(eq(orders.id, orderId));
}

export async function reassignOrderMachine(orderId: number, machineId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ machineId }).where(eq(orders.id, orderId));
}

// ============ MATERIAL RECIPES ============

export async function createRecipe(data: { name: string; product: string; description?: string; createdById: number }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(materialRecipes).values({ name: data.name, product: data.product, description: data.description ?? null, createdById: data.createdById });
  return result[0].insertId;
}

export async function getAllRecipes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(materialRecipes).orderBy(desc(materialRecipes.createdAt));
}

export async function getRecipeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(materialRecipes).where(eq(materialRecipes.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getRecipeComponents(recipeId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recipeComponents).where(eq(recipeComponents.recipeId, recipeId)).orderBy(asc(recipeComponents.sortOrder));
}

export async function createRecipeComponent(data: { recipeId: number; materialName: string; percentage: string; weightKg?: string; notes?: string; sortOrder?: number }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(recipeComponents).values({
    recipeId: data.recipeId, materialName: data.materialName, percentage: data.percentage, weightKg: data.weightKg ?? null, notes: data.notes ?? null, sortOrder: data.sortOrder ?? 0,
  });
  return result[0].insertId;
}

export async function updateRecipeComponent(id: number, data: Partial<{ materialName: string; percentage: string; weightKg: string | null; notes: string | null }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(recipeComponents).set(data).where(eq(recipeComponents.id, id));
}

export async function deleteRecipeComponent(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(recipeComponents).where(eq(recipeComponents.id, id));
}

export async function updateRecipe(id: number, data: Partial<{ name: string; product: string; description: string | null }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(materialRecipes).set(data).where(eq(materialRecipes.id, id));
}

export async function deleteRecipe(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(recipeComponents).where(eq(recipeComponents.recipeId, id));
  await db.delete(materialRecipes).where(eq(materialRecipes.id, id));
}

// ============ ROLE PERMISSIONS ============

export async function getAllRolePermissions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rolePermissions).orderBy(asc(rolePermissions.roleSlug), asc(rolePermissions.module));
}

export async function getPermissionsForRole(roleSlug: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rolePermissions).where(eq(rolePermissions.roleSlug, roleSlug)).orderBy(asc(rolePermissions.module));
}

export async function upsertRolePermission(roleSlug: string, module: string, hasAccess: boolean) {
  const db = await getDb();
  if (!db) return null;
  // Check if exists
  const existing = await db.select().from(rolePermissions)
    .where(and(eq(rolePermissions.roleSlug, roleSlug), eq(rolePermissions.module, module))).limit(1);
  if (existing.length > 0) {
    await db.update(rolePermissions).set({ hasAccess }).where(eq(rolePermissions.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(rolePermissions).values({ roleSlug, module, hasAccess });
    return result[0].insertId;
  }
}

export async function bulkUpsertPermissions(permissions: Array<{ roleSlug: string; module: string; hasAccess: boolean }>) {
  for (const p of permissions) {
    await upsertRolePermission(p.roleSlug, p.module, p.hasAccess);
  }
}

export async function seedDefaultPermissions(roleSlugs: string[], modules: string[]) {
  const db = await getDb();
  if (!db) return;
  const existing = await getAllRolePermissions();
  const existingKeys = new Set(existing.map(p => `${p.roleSlug}:${p.module}`));
  
  // Default: managers get all access, others get checklist + tasks
  const managerRoles = ["production_manager", "production_director"];
  const defaultAccessAll = ["checklist", "tasks", "reports", "orders", "recipes", "monitoring", "analytics", "dictionaries"];
  const defaultAccessBasic = ["checklist", "tasks"];
  
  for (const roleSlug of roleSlugs) {
    for (const module of modules) {
      const key = `${roleSlug}:${module}`;
      if (existingKeys.has(key)) continue;
      const isManager = managerRoles.includes(roleSlug);
      const hasAccess = isManager ? true : (defaultAccessBasic.includes(module));
      await db.insert(rolePermissions).values({ roleSlug, module, hasAccess });
    }
  }
}

export async function createLookupItemsBulk(items: Array<{ category: string; value: string; sortOrder: number }>) {
  const db = await getDb();
  if (!db) return;
  if (items.length === 0) return;
  await db.insert(lookupItems).values(items);
}

// ============ MATERIAL REQUESTS ============

export async function createMaterialRequest(data: {
  orderId: number; recipeId?: number; product: string; baseWeightKg?: string; notes?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(materialRequests).values({
    orderId: data.orderId,
    recipeId: data.recipeId ?? null,
    product: data.product,
    baseWeightKg: data.baseWeightKg ?? null,
    notes: data.notes ?? null,
  });
  return result[0].insertId;
}

export async function createMaterialRequestItem(data: {
  requestId: number; materialName: string; percentage: string; calculatedKg?: string; actualKg?: string; batchNumber?: string; sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(materialRequestItems).values({
    requestId: data.requestId,
    materialName: data.materialName,
    percentage: data.percentage,
    calculatedKg: data.calculatedKg ?? null,
    actualKg: data.actualKg ?? null,
    batchNumber: data.batchNumber ?? null,
    sortOrder: data.sortOrder ?? 0,
  });
  return result[0].insertId;
}

export async function getAllMaterialRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(materialRequests).orderBy(desc(materialRequests.createdAt));
}

export async function getMaterialRequestById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(materialRequests).where(eq(materialRequests.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getMaterialRequestByOrderId(orderId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(materialRequests).where(eq(materialRequests.orderId, orderId)).limit(1);
  return result[0] ?? null;
}

export async function getMaterialRequestItems(requestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(materialRequestItems).where(eq(materialRequestItems.requestId, requestId)).orderBy(asc(materialRequestItems.sortOrder));
}

export async function getMaterialRequestReadiness(requestId: number) {
  const request = await getMaterialRequestById(requestId);
  const items = await getMaterialRequestItems(requestId);
  const missingBatch = items.filter((item) => !item.batchNumber);
  const missingActual = items.filter((item) => item.actualKg == null);
  const actualTotalKg = items.reduce((sum, item) => sum + parseFloat(item.actualKg ?? "0"), 0);
  const calculatedTotalKg = items.reduce((sum, item) => sum + parseFloat(item.calculatedKg ?? "0"), 0);

  return {
    request,
    items,
    totals: {
      calculatedTotalKg: Number(calculatedTotalKg.toFixed(3)),
      actualTotalKg: Number(actualTotalKg.toFixed(3)),
      componentCount: items.length,
    },
    missing: {
      batchNumbers: missingBatch.map((item) => item.id),
      actualWeights: missingActual.map((item) => item.id),
    },
    isReadyForIssue: items.length > 0 && missingBatch.length === 0 && missingActual.length === 0,
  };
}

export async function getProductionKpis(dateFrom?: Date, dateTo?: Date) {
  const db = await getDb();
  if (!db) {
    return {
      ordersTotal: 0,
      ordersCompleted: 0,
      completionRate: 0,
      plannedQty: 0,
      producedQty: 0,
      uptimeByMachine: [],
    };
  }

  const orderFilters = [];
  if (dateFrom) orderFilters.push(gte(orders.createdAt, dateFrom));
  if (dateTo) orderFilters.push(lte(orders.createdAt, dateTo));

  const reportRowFilters = [];
  if (dateFrom) reportRowFilters.push(gte(shiftReportRows.createdAt, dateFrom));
  if (dateTo) reportRowFilters.push(lte(shiftReportRows.createdAt, dateTo));

  const ordersQuery = db.select().from(orders);
  const reportRowsQuery = db.select().from(shiftReportRows);

  const [filteredOrders, reportRows, allMachines] = await Promise.all([
    orderFilters.length ? ordersQuery.where(and(...orderFilters)) : ordersQuery,
    reportRowFilters.length ? reportRowsQuery.where(and(...reportRowFilters)) : reportRowsQuery,
    db.select().from(machines),
  ]);

  const ordersTotal = filteredOrders.length;
  const ordersCompleted = filteredOrders.filter((o) => o.status === "completed").length;
  const plannedQty = filteredOrders.reduce((sum, o) => sum + (o.quantity ?? 0), 0);
  const producedQty = filteredOrders.reduce((sum, o) => sum + (o.completedQty ?? 0), 0);

  const uptimeByMachine = allMachines.map((machine) => {
    const rows = reportRows.filter((row) => row.machineNumber === machine.number);
    const downtimeMin = rows.reduce((sum, row) => sum + (row.downtimeMin ?? 0), 0);
    const runtimeMin = rows.reduce((sum, row) => sum + Math.max(0, row.actualQty ?? 0), 0);
    const total = runtimeMin + downtimeMin;
    return {
      machineId: machine.id,
      machineNumber: machine.number,
      downtimeMin,
      runtimeMin,
      uptimePercent: total > 0 ? Math.round((runtimeMin / total) * 100) : 0,
    };
  });

  return {
    ordersTotal,
    ordersCompleted,
    completionRate: ordersTotal > 0 ? Math.round((ordersCompleted / ordersTotal) * 100) : 0,
    plannedQty,
    producedQty,
    uptimeByMachine,
  };
}

export async function updateMaterialRequest(id: number, data: Partial<{ baseWeightKg: string | null; status: "pending" | "in_progress" | "completed"; notes: string | null }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(materialRequests).set(data).where(eq(materialRequests.id, id));
}

export async function updateMaterialRequestItem(id: number, data: Partial<{ calculatedKg: string | null; actualKg: string | null; batchNumber: string | null }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(materialRequestItems).set(data).where(eq(materialRequestItems.id, id));
}

export async function addMaterialRequestItem(data: {
  requestId: number; materialName: string; percentage: string; calculatedKg?: string; sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(materialRequestItems).values({
    requestId: data.requestId,
    materialName: data.materialName,
    percentage: data.percentage,
    calculatedKg: data.calculatedKg ?? null,
    sortOrder: data.sortOrder ?? 0,
  });
  return result[0].insertId;
}

export async function deleteMaterialRequestItem(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(materialRequestItems).where(eq(materialRequestItems.id, id));
}

// ============ CUSTOM REPORT FIELDS ============

export async function getAllCustomReportFields() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customReportFields).orderBy(asc(customReportFields.sortOrder));
}

export async function getActiveCustomReportFields() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customReportFields).where(eq(customReportFields.isActive, true)).orderBy(asc(customReportFields.sortOrder));
}

export async function createCustomReportField(data: {
  name: string; label: string; fieldType: "text" | "number" | "decimal" | "boolean"; isRequired?: boolean; sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(customReportFields).values({
    name: data.name,
    label: data.label,
    fieldType: data.fieldType,
    isRequired: data.isRequired ?? false,
    sortOrder: data.sortOrder ?? 0,
  });
  return result[0].insertId;
}

export async function updateCustomReportField(id: number, data: Partial<{ name: string; label: string; fieldType: "text" | "number" | "decimal" | "boolean"; isRequired: boolean; isActive: boolean; sortOrder: number }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(customReportFields).set(data).where(eq(customReportFields.id, id));
}

export async function deleteCustomReportField(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(customFieldValues).where(eq(customFieldValues.fieldId, id));
  await db.delete(customReportFields).where(eq(customReportFields.id, id));
}

export async function getCustomFieldValuesForRow(reportRowId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(customFieldValues).where(eq(customFieldValues.reportRowId, reportRowId));
}

export async function upsertCustomFieldValue(reportRowId: number, fieldId: number, value: string | null) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(customFieldValues)
    .where(and(eq(customFieldValues.reportRowId, reportRowId), eq(customFieldValues.fieldId, fieldId))).limit(1);
  if (existing.length > 0) {
    await db.update(customFieldValues).set({ value }).where(eq(customFieldValues.id, existing[0].id));
  } else {
    await db.insert(customFieldValues).values({ reportRowId, fieldId, value });
  }
}

// ============ UPDATED LOOKUP HELPERS ============

export async function updateLookupItemFull(id: number, data: Partial<{ value: string; parentProduct: string | null; standardWeight: string | null; isActive: boolean; sortOrder: number }>) {
  const db = await getDb();
  if (!db) return;
  await db.update(lookupItems).set(data).where(eq(lookupItems.id, id));
}

export async function getRecipesForProduct(product: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(materialRecipes).where(eq(materialRecipes.product, product)).orderBy(desc(materialRecipes.createdAt));
}

// ============ ANALYTICS HELPERS ============

export async function getProductAnalytics(dateFrom?: string, dateTo?: string) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select({
    product: shiftReportRows.moldProduct,
    machineNumber: shiftReportRows.machineNumber,
    totalPlan: sql<number>`SUM(${shiftReportRows.planQty})`,
    totalActual: sql<number>`SUM(${shiftReportRows.actualQty})`,
    totalDefectKg: sql<number>`SUM(${shiftReportRows.defectKg})`,
    totalDowntimeMin: sql<number>`SUM(${shiftReportRows.downtimeMin})`,
    rowCount: sql<number>`COUNT(*)`,
  }).from(shiftReportRows)
    .groupBy(shiftReportRows.moldProduct, shiftReportRows.machineNumber)
    .orderBy(desc(sql`SUM(${shiftReportRows.actualQty})`));
  return query;
}

export async function getMaterialAnalytics() {
  const db = await getDb();
  if (!db) return [];
  // Aggregate material usage from material request items
  return db.select({
    materialName: materialRequestItems.materialName,
    totalCalculatedKg: sql<number>`SUM(COALESCE(${materialRequestItems.calculatedKg}, 0))`,
    totalActualKg: sql<number>`SUM(COALESCE(${materialRequestItems.actualKg}, 0))`,
    requestCount: sql<number>`COUNT(DISTINCT ${materialRequestItems.requestId})`,
  }).from(materialRequestItems)
    .groupBy(materialRequestItems.materialName)
    .orderBy(desc(sql`SUM(COALESCE(${materialRequestItems.calculatedKg}, 0))`));
}

export async function getOrderAnalytics() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    product: orders.product,
    totalOrders: sql<number>`COUNT(*)`,
    totalQuantity: sql<number>`SUM(${orders.quantity})`,
    totalCompleted: sql<number>`SUM(${orders.completedQty})`,
    completedOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'completed' THEN 1 ELSE 0 END)`,
    inProgressOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'in_progress' THEN 1 ELSE 0 END)`,
  }).from(orders)
    .groupBy(orders.product)
    .orderBy(desc(sql`COUNT(*)`));
}
