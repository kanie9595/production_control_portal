import { eq, and, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  productionRoles,
  checklistTemplates,
  templateItems,
  checklistInstances,
  instanceItems,
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
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

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
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
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
  const result = await db.insert(productionRoles).values({
    slug: data.slug,
    name: data.name,
    description: data.description ?? null,
    sortOrder: data.sortOrder ?? 0,
  });
  return result[0].insertId;
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
  const result = await db.insert(templateItems).values({
    templateId: data.templateId,
    sectionTitle: data.sectionTitle,
    sectionIcon: data.sectionIcon ?? "clipboard",
    text: data.text,
    sortOrder: data.sortOrder ?? 0,
  });
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

// ============ CHECKLIST INSTANCES ============

export async function getOrCreateInstance(templateId: number, userId: number, dateKey: string) {
  const db = await getDb();
  if (!db) return null;

  const existing = await db.select().from(checklistInstances)
    .where(and(
      eq(checklistInstances.templateId, templateId),
      eq(checklistInstances.userId, userId),
      eq(checklistInstances.dateKey, dateKey),
    )).limit(1);

  if (existing.length > 0) return existing[0];

  const result = await db.insert(checklistInstances).values({ templateId, userId, dateKey });
  const newId = result[0].insertId;

  // Create instance items from template items
  const items = await getTemplateItems(templateId);
  if (items.length > 0) {
    await db.insert(instanceItems).values(
      items.map((item) => ({
        instanceId: newId,
        templateItemId: item.id,
        checked: false,
        note: null,
      }))
    );
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
  await db.update(instanceItems).set({
    checked,
    checkedAt: checked ? new Date() : null,
  }).where(eq(instanceItems.id, itemId));
}

export async function setInstanceItemNote(itemId: number, note: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(instanceItems).set({ note }).where(eq(instanceItems.id, itemId));
}

// ============ MANAGER DASHBOARD ============

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
