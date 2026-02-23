import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";

// Admin-only procedure (site admin)
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

// Manager procedure: accessible by admin OR users with productionRole = "production_manager" or "production_director"
const MANAGER_ROLES = ["production_manager", "production_director"];

const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const isAdmin = ctx.user.role === "admin";
  const isManager = MANAGER_ROLES.includes(ctx.user.productionRole ?? "");
  if (!isAdmin && !isManager) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Доступ только для Начальника производства и Директора производства" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ PRODUCTION ROLES ============
  roles: router({
    list: publicProcedure.query(async () => db.getAllProductionRoles()),
    create: managerProcedure
      .input(z.object({ slug: z.string(), name: z.string(), description: z.string().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => ({ id: await db.createProductionRole(input) })),
    update: managerProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), description: z.string().nullable().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await db.updateProductionRole(id, data); return { success: true }; }),
  }),

  // ============ USERS (admin only) ============
  users: router({
    list: adminProcedure.query(async () => db.getAllUsers()),
    listAll: protectedProcedure.query(async () => db.getAllUsers()),
    setProductionRole: adminProcedure
      .input(z.object({ userId: z.number(), productionRole: z.string().nullable() }))
      .mutation(async ({ input }) => {
        await db.setUserProductionRole(input.userId, input.productionRole);
        return { success: true };
      }),
  }),

  // ============ TEMPLATES ============
  templates: router({
    list: protectedProcedure.query(async () => db.getAllTemplates()),
    listForRole: protectedProcedure
      .input(z.object({ roleId: z.number() }))
      .query(async ({ input }) => db.getTemplatesForRole(input.roleId)),
    create: adminProcedure
      .input(z.object({ roleId: z.number(), periodType: z.enum(["daily", "weekly", "monthly"]), title: z.string() }))
      .mutation(async ({ input }) => ({ id: await db.createTemplate(input) })),
    update: adminProcedure
      .input(z.object({ id: z.number(), title: z.string().optional() }))
      .mutation(async ({ input }) => { await db.updateTemplate(input.id, { title: input.title }); return { success: true }; }),
    items: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .query(async ({ input }) => db.getTemplateItems(input.templateId)),
    addItem: adminProcedure
      .input(z.object({ templateId: z.number(), sectionTitle: z.string(), sectionIcon: z.string().optional(), text: z.string(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => ({ id: await db.createTemplateItem(input) })),
    updateItem: adminProcedure
      .input(z.object({ id: z.number(), text: z.string().optional(), sectionTitle: z.string().optional(), sectionIcon: z.string().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await db.updateTemplateItem(id, data); return { success: true }; }),
    deleteItem: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteTemplateItem(input.id); return { success: true }; }),
  }),

  // ============ INSTANCES (employee checklists) ============
  instances: router({
    getOrCreate: protectedProcedure
      .input(z.object({ templateId: z.number(), dateKey: z.string() }))
      .mutation(async ({ ctx, input }) => db.getOrCreateInstance(input.templateId, ctx.user.id, input.dateKey)),
    items: protectedProcedure
      .input(z.object({ instanceId: z.number() }))
      .query(async ({ input }) => db.getInstanceItems(input.instanceId)),
    toggleItem: protectedProcedure
      .input(z.object({ itemId: z.number(), checked: z.boolean() }))
      .mutation(async ({ input }) => { await db.toggleInstanceItem(input.itemId, input.checked); return { success: true }; }),
    setNote: protectedProcedure
      .input(z.object({ itemId: z.number(), note: z.string() }))
      .mutation(async ({ input }) => { await db.setInstanceItemNote(input.itemId, input.note); return { success: true }; }),
  }),

  // ============ MANAGER DASHBOARD ============
  dashboard: router({
    overview: managerProcedure
      .input(z.object({ periodType: z.enum(["daily", "weekly", "monthly"]) }))
      .query(async ({ input }) => {
        const instances = await db.getAllInstancesForPeriod(input.periodType);
        const allUsers = await db.getAllUsers();
        const roles = await db.getAllProductionRoles();
        const templates = await db.getAllTemplates();
        const allTemplateItems = await db.getAllTemplateItems();
        const results = [];
        for (const instance of instances) {
          const items = await db.getInstanceItems(instance.id);
          const user = allUsers.find((u) => u.id === instance.userId);
          const template = templates.find((t) => t.id === instance.templateId);
          const role = template ? roles.find((r) => r.id === template.roleId) : null;
          const total = items.length;
          const completed = items.filter((i) => i.checked).length;
          const enrichedItems = items.map((ii) => {
            const ti = allTemplateItems.find((t) => t.id === ii.templateItemId);
            return { ...ii, text: ti?.text ?? `Пункт #${ii.templateItemId}` };
          });
          results.push({
            instanceId: instance.id, userId: instance.userId, userName: user?.name ?? "Неизвестный",
            roleName: role?.name ?? "Без роли", roleSlug: role?.slug ?? "",
            templateTitle: template?.title ?? "", periodType: template?.periodType ?? input.periodType,
            total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0,
            items: enrichedItems, updatedAt: instance.updatedAt,
          });
        }
        return results;
      }),
  }),

  // ============ ANALYTICS ============
  analytics: router({
    checklistHistory: managerProcedure
      .input(z.object({
        userId: z.number().optional(),
        roleSlug: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }))
      .query(async ({ input }) => db.getChecklistHistory(input)),
  }),

  // ============ TASKS ============
  tasks: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const isAdmin = ctx.user.role === "admin";
      const isManager = MANAGER_ROLES.includes(ctx.user.productionRole ?? "");
      if (isAdmin || isManager) {
        return db.getAllTasks();
      }
      return db.getTasksForUser(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        assigneeId: z.number(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        deadline: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createTask({
          title: input.title,
          description: input.description,
          assigneeId: input.assigneeId,
          creatorId: ctx.user.id,
          priority: input.priority,
          deadline: input.deadline ? new Date(input.deadline) : undefined,
        });
        // Notify owner about new task
        const allUsers = await db.getAllUsers();
        const assignee = allUsers.find(u => u.id === input.assigneeId);
        try {
          await notifyOwner({
            title: `Новая задача: ${input.title}`,
            content: `Задача назначена: ${assignee?.name ?? "Сотрудник"}. Приоритет: ${input.priority ?? "medium"}. Создал: ${ctx.user.name ?? "Менеджер"}.`,
          });
        } catch (e) { console.warn("[Tasks] Failed to notify:", e); }
        return { id };
      }),
    updateStatus: protectedProcedure
      .input(z.object({ taskId: z.number(), status: z.enum(["pending", "in_progress", "completed", "cancelled"]) }))
      .mutation(async ({ input }) => { await db.updateTaskStatus(input.taskId, input.status); return { success: true }; }),
    update: adminProcedure
      .input(z.object({
        taskId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        deadline: z.string().nullable().optional(),
        assigneeId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { taskId, ...data } = input;
        const updateData: any = { ...data };
        if (data.deadline !== undefined) {
          updateData.deadline = data.deadline ? new Date(data.deadline) : null;
        }
        await db.updateTask(taskId, updateData);
        return { success: true };
      }),
  }),

  // ============ LOOKUP ITEMS (for report dropdowns) ============
  lookups: router({
    byCategory: protectedProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ input }) => db.getLookupsByCategory(input.category)),
    all: protectedProcedure.query(async () => db.getAllLookups()),
    moldsForProduct: protectedProcedure
      .input(z.object({ product: z.string() }))
      .query(async ({ input }) => db.getMoldsForProduct(input.product)),
    create: managerProcedure
      .input(z.object({ category: z.string(), value: z.string(), parentProduct: z.string().optional(), standardWeight: z.string().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => ({ id: await db.createLookupItem(input) })),
    update: managerProcedure
      .input(z.object({ id: z.number(), value: z.string().optional(), parentProduct: z.string().nullable().optional(), standardWeight: z.string().nullable().optional(), sortOrder: z.number().optional(), isActive: z.boolean().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await db.updateLookupItemFull(id, data); return { success: true }; }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteLookupItem(input.id); return { success: true }; }),
  }),

  // ============ SHIFT REPORTS ============
  reports: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const isAdmin = ctx.user.role === "admin";
      const isManager = MANAGER_ROLES.includes(ctx.user.productionRole ?? "");
      const allReports = await db.getAllShiftReports();
      if (isAdmin || isManager) return allReports;
      return allReports.filter(r => r.userId === ctx.user.id);
    }),
    delete: managerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteShiftReport(input.id);
        return { success: true };
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const report = await db.getShiftReportById(input.id);
        const rows = report ? await db.getShiftReportRows(report.id) : [];
        return { report, rows };
      }),
    create: protectedProcedure
      .input(z.object({ shiftDate: z.string(), shiftNumber: z.number(), notes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createShiftReport({ userId: ctx.user.id, shiftDate: input.shiftDate, shiftNumber: input.shiftNumber, notes: input.notes });
        return { id };
      }),
    addRow: protectedProcedure
      .input(z.object({
        reportId: z.number(), orderId: z.number().optional(), machineNumber: z.string(), moldProduct: z.string(), productColor: z.string(),
        planQty: z.number(), actualQty: z.number(), standardCycle: z.string(), actualCycle: z.string(),
        standardWeight: z.string().optional(), avgWeight: z.string().optional(),
        downtimeMin: z.number(), downtimeReason: z.string().optional(), defectKg: z.string(), changeover: z.number(), sortOrder: z.number().optional(),
        customFields: z.array(z.object({ fieldId: z.number(), value: z.string().nullable() })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { customFields, ...rowData } = input;
        const id = await db.createShiftReportRow(rowData);
        // Auto-deduct: increment order completedQty when actualQty is reported
        if (input.orderId && input.actualQty > 0) {
          await db.incrementOrderCompletedQty(input.orderId, input.actualQty);
        }
        // Save custom field values
        if (customFields && id) {
          for (const cf of customFields) {
            await db.upsertCustomFieldValue(id, cf.fieldId, cf.value);
          }
        }
        return { id };
      }),
    updateRow: protectedProcedure
      .input(z.object({
        id: z.number(), machineNumber: z.string().optional(), moldProduct: z.string().optional(), productColor: z.string().optional(),
        planQty: z.number().optional(), actualQty: z.number().optional(), standardCycle: z.string().optional(), actualCycle: z.string().optional(),
        downtimeMin: z.number().optional(), downtimeReason: z.string().nullable().optional(), defectKg: z.string().optional(), changeover: z.number().optional(),
      }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await db.updateShiftReportRow(id, data); return { success: true }; }),
    deleteRow: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // Reverse the deduction from the order before deleting
        const row = await db.getShiftReportRowById(input.id);
        if (row && row.orderId && row.actualQty > 0) {
          await db.decrementOrderCompletedQty(row.orderId, row.actualQty);
        }
        await db.deleteShiftReportRow(input.id);
        return { success: true };
      }),
    analytics: protectedProcedure
      .input(z.object({ moldProduct: z.string() }))
      .query(async ({ input }) => db.getReportAnalytics(input.moldProduct)),
    customFieldValues: protectedProcedure
      .input(z.object({ reportRowId: z.number() }))
      .query(async ({ input }) => db.getCustomFieldValuesForRow(input.reportRowId)),
  }),

  // ============ MACHINES ============
  machines: router({
    list: protectedProcedure.query(async () => db.getAllMachines()),
    board: protectedProcedure.query(async () => db.getMachineBoard()),
    updateStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(["running", "idle", "maintenance", "changeover"]) }))
      .mutation(async ({ input }) => { await db.updateMachineStatus(input.id, input.status); return { success: true }; }),
  }),

  // ============ ORDERS ============
  orders: router({
    list: protectedProcedure.query(async () => db.getAllOrders()),
    forMachine: protectedProcedure
      .input(z.object({ machineId: z.number() }))
      .query(async ({ input }) => db.getOrdersForMachine(input.machineId)),
    activeForMachine: protectedProcedure
      .input(z.object({ machineId: z.number() }))
      .query(async ({ input }) => db.getActiveOrderForMachine(input.machineId)),
    create: managerProcedure
      .input(z.object({
        machineId: z.number(), product: z.string(), color: z.string().optional(), quantity: z.number(),
        moldName: z.string().optional(), notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createOrder({ ...input, createdById: ctx.user.id });
        // Auto-create material request from recipe if product has one
        if (id) {
          const recipes = await db.getRecipesForProduct(input.product);
          if (recipes.length > 0) {
            const recipe = recipes[0]; // Use first matching recipe
            const components = await db.getRecipeComponents(recipe.id);
            const requestId = await db.createMaterialRequest({
              orderId: id, recipeId: recipe.id, product: input.product,
              notes: `Автозаявка из рецепта: ${recipe.name}`,
            });
            if (requestId) {
              for (const comp of components) {
                await db.createMaterialRequestItem({
                  requestId, materialName: comp.materialName,
                  percentage: comp.percentage, sortOrder: comp.sortOrder,
                });
              }
            }
          }
        }
        // Notify owner about new order
        const allMachines = await db.getAllMachines();
        const machine = allMachines.find(m => m.id === input.machineId);
        try {
          await notifyOwner({
            title: `Новый заказ: ${input.product}`,
            content: `Станок: ${machine?.number ?? "?"} (${machine?.name ?? "?"}). Количество: ${input.quantity} кор. Цвет: ${input.color ?? "не указан"}. Создал: ${ctx.user.name ?? "Менеджер"}.`,
          });
        } catch (e) { console.warn("[Orders] Failed to notify:", e); }
        return { id };
      }),
    updateStatus: protectedProcedure
      .input(z.object({ orderId: z.number(), status: z.enum(["pending", "in_progress", "completed", "cancelled"]) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateOrderStatus(input.orderId, input.status);
        // Auto-update machine status based on order status
        const order = await db.getOrderById(input.orderId);
        if (order) {
          if (input.status === "in_progress") {
            await db.updateMachineStatus(order.machineId, "running");
          } else if (input.status === "completed" || input.status === "cancelled") {
            // Check if machine has other active orders
            const otherActive = (await db.getOrdersForMachine(order.machineId))
              .filter(o => o.id !== input.orderId && o.status === "in_progress");
            if (otherActive.length === 0) {
              await db.updateMachineStatus(order.machineId, "idle");
            }
          }
          // Notify production manager when order is completed
          if (input.status === "completed") {
            const allMachines = await db.getAllMachines();
            const machine = allMachines.find(m => m.id === order.machineId);
            try {
              await notifyOwner({
                title: `Заказ выполнен: ${order.product}`,
                content: `Станок: ${machine?.number ?? "?"} (${machine?.name ?? "?"}). Продукция: ${order.product}. Количество: ${order.quantity} кор. Выполнено: ${order.completedQty} кор. Завершил: ${ctx.user.name ?? "Сотрудник"}.`,
              });
            } catch (e) { console.warn("[Orders] Failed to notify completion:", e); }
          }
        }
        return { success: true };
      }),
    update: managerProcedure
      .input(z.object({
        orderId: z.number(), product: z.string().optional(), color: z.string().optional(), quantity: z.number().optional(),
        completedQty: z.number().optional(), moldName: z.string().optional(), notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => { const { orderId, ...data } = input; await db.updateOrder(orderId, data); return { success: true }; }),
    reassignMachine: managerProcedure
      .input(z.object({ orderId: z.number(), machineId: z.number() }))
      .mutation(async ({ input }) => {
        await db.reassignOrderMachine(input.orderId, input.machineId);
        return { success: true };
      }),
    // Get active/pending orders for a machine (for report linking)
    activeOrdersForMachine: protectedProcedure
      .input(z.object({ machineId: z.number() }))
      .query(async ({ input }) => {
        const allOrders = await db.getOrdersForMachine(input.machineId);
        return allOrders.filter(o => o.status === "in_progress" || o.status === "pending");
      }),
  }),

  // ============ MATERIAL RECIPES ============
  recipes: router({
    list: protectedProcedure.query(async () => db.getAllRecipes()),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const recipe = await db.getRecipeById(input.id);
        const components = recipe ? await db.getRecipeComponents(recipe.id) : [];
        return { recipe, components };
      }),
    create: protectedProcedure
      .input(z.object({ name: z.string(), product: z.string(), description: z.string().optional() }))
      .mutation(async ({ ctx, input }) => ({ id: await db.createRecipe({ ...input, createdById: ctx.user.id }) })),
    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), product: z.string().optional(), description: z.string().nullable().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await db.updateRecipe(id, data); return { success: true }; }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteRecipe(input.id); return { success: true }; }),
    addComponent: protectedProcedure
      .input(z.object({ recipeId: z.number(), materialName: z.string(), percentage: z.string(), weightKg: z.string().optional(), notes: z.string().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => ({ id: await db.createRecipeComponent(input) })),
    updateComponent: protectedProcedure
      .input(z.object({ id: z.number(), materialName: z.string().optional(), percentage: z.string().optional(), weightKg: z.string().nullable().optional(), notes: z.string().nullable().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await db.updateRecipeComponent(id, data); return { success: true }; }),
    deleteComponent: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteRecipeComponent(input.id); return { success: true }; }),
  }),

  // ============ ROLE PERMISSIONS ============
  permissions: router({
    all: managerProcedure.query(async () => db.getAllRolePermissions()),
    forRole: managerProcedure
      .input(z.object({ roleSlug: z.string() }))
      .query(async ({ input }) => db.getPermissionsForRole(input.roleSlug)),
    forCurrentUser: protectedProcedure.query(async ({ ctx }) => {
      const roleSlug = ctx.user.productionRole;
      if (!roleSlug) return [];
      return db.getPermissionsForRole(roleSlug);
    }),
    update: managerProcedure
      .input(z.object({ roleSlug: z.string(), module: z.string(), hasAccess: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.upsertRolePermission(input.roleSlug, input.module, input.hasAccess);
        return { success: true };
      }),
    bulkUpdate: managerProcedure
      .input(z.object({ permissions: z.array(z.object({ roleSlug: z.string(), module: z.string(), hasAccess: z.boolean() })) }))
      .mutation(async ({ input }) => {
        await db.bulkUpsertPermissions(input.permissions);
        return { success: true };
      }),
  }),

  // ============ MATERIAL REQUESTS ============
  materialRequests: router({
    list: protectedProcedure.query(async () => db.getAllMaterialRequests()),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const request = await db.getMaterialRequestById(input.id);
        const items = request ? await db.getMaterialRequestItems(request.id) : [];
        return { request, items };
      }),
    getByOrder: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        const request = await db.getMaterialRequestByOrderId(input.orderId);
        const items = request ? await db.getMaterialRequestItems(request.id) : [];
        return { request, items };
      }),
    update: protectedProcedure
      .input(z.object({ id: z.number(), baseWeightKg: z.string().nullable().optional(), status: z.enum(["pending", "in_progress", "completed"]).optional(), notes: z.string().nullable().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await db.updateMaterialRequest(id, data); return { success: true }; }),
    updateItem: protectedProcedure
      .input(z.object({ id: z.number(), calculatedKg: z.string().nullable().optional(), actualKg: z.string().nullable().optional(), batchNumber: z.string().nullable().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await db.updateMaterialRequestItem(id, data); return { success: true }; }),
    addItem: protectedProcedure
      .input(z.object({ requestId: z.number(), materialName: z.string(), percentage: z.string(), calculatedKg: z.string().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => ({ id: await db.addMaterialRequestItem(input) })),
    deleteItem: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteMaterialRequestItem(input.id); return { success: true }; }),
    recalculate: protectedProcedure
      .input(z.object({ requestId: z.number(), baseWeightKg: z.string() }))
      .mutation(async ({ input }) => {
        // Update base weight and recalculate all items
        await db.updateMaterialRequest(input.requestId, { baseWeightKg: input.baseWeightKg });
        const items = await db.getMaterialRequestItems(input.requestId);
        const baseKg = parseFloat(input.baseWeightKg);
        
        // Calculate total percentage and normalize to 100%
        const totalPercent = items.reduce((sum, item) => sum + parseFloat(item.percentage || "0"), 0);
        const normalizeFactor = totalPercent > 0 ? 100 / totalPercent : 1;
        
        for (const item of items) {
          const rawPct = parseFloat(item.percentage || "0");
          // Normalize percentage to ensure total is 100%
          const normalizedPct = rawPct * normalizeFactor;
          const calcKg = ((normalizedPct / 100) * baseKg).toFixed(3);
          await db.updateMaterialRequestItem(item.id, { calculatedKg: calcKg });
        }
        return { success: true };
      }),
    readiness: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .query(async ({ input }) => db.getMaterialRequestReadiness(input.requestId)),
  }),

  // ============ CUSTOM REPORT FIELDS ============
  customFields: router({
    list: protectedProcedure.query(async () => db.getAllCustomReportFields()),
    active: protectedProcedure.query(async () => db.getActiveCustomReportFields()),
    create: managerProcedure
      .input(z.object({ name: z.string(), label: z.string(), fieldType: z.enum(["text", "number", "decimal", "boolean"]), isRequired: z.boolean().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => ({ id: await db.createCustomReportField(input) })),
    update: managerProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), label: z.string().optional(), fieldType: z.enum(["text", "number", "decimal", "boolean"]).optional(), isRequired: z.boolean().optional(), isActive: z.boolean().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await db.updateCustomReportField(id, data); return { success: true }; }),
    delete: managerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteCustomReportField(input.id); return { success: true }; }),
  }),

  // ============ PRODUCTION ANALYTICS ============
  productionAnalytics: router({
    products: protectedProcedure.query(async () => db.getProductAnalytics()),
    materials: protectedProcedure.query(async () => db.getMaterialAnalytics()),
    orders: protectedProcedure.query(async () => db.getOrderAnalytics()),
    overview: protectedProcedure
      .input(z.object({ dateFrom: z.string().optional(), dateTo: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const from = input?.dateFrom ? new Date(input.dateFrom) : undefined;
        const to = input?.dateTo ? new Date(input.dateTo) : undefined;
        return db.getProductionKpis(from, to);
      }),
  }),

  // ============ ENHANCED LOOKUPS (bulk operations) ============
  lookupsBulk: router({
    createBulk: adminProcedure
      .input(z.object({ items: z.array(z.object({ category: z.string(), value: z.string(), sortOrder: z.number() })) }))
      .mutation(async ({ input }) => {
        await db.createLookupItemsBulk(input.items);
        return { success: true };
      }),
  }),

  // ============ SEED (admin only) ============
  seed: router({
    run: adminProcedure.mutation(async () => {
      const existingRoles = await db.getAllProductionRoles();
      const existingSlugs = new Set(existingRoles.map((r) => r.slug));

      const rolesData = [
        { slug: "packer", name: "Упаковщик", description: "Упаковщик готовой продукции", sortOrder: 1 },
        { slug: "adjuster", name: "Наладчик ТПА", description: "Наладчик термопластавтоматов", sortOrder: 2 },
        { slug: "mechanic", name: "Механик", description: "Механик по обслуживанию оборудования", sortOrder: 3 },
        { slug: "shift_supervisor", name: "Начальник смены", description: "Начальник производственной смены", sortOrder: 4 },
        { slug: "production_manager", name: "Начальник производства", description: "Начальник производства", sortOrder: 5 },
        { slug: "production_director", name: "Директор производства", description: "Директор производства, контролирует все процессы", sortOrder: 6 },
        { slug: "shift_assistant", name: "Помощница начальника смены", description: "Помощница начальника смены", sortOrder: 7 },
        { slug: "packer_foreman", name: "Бригадир упаковщиков", description: "Бригадир упаковщиков, контролирует упаковочную линию", sortOrder: 8 },
        { slug: "senior_mechanic", name: "Старший механик", description: "Старший механик, руководит отделом механиков", sortOrder: 9 },
        { slug: "senior_adjuster", name: "Старший наладчик ТПА", description: "Старший наладчик ТПА, руководит командами наладчиков", sortOrder: 10 },
      ];

      const roleIds: Record<string, number> = {};
      for (const er of existingRoles) { roleIds[er.slug] = er.id; }
      for (const r of rolesData) {
        if (existingSlugs.has(r.slug)) continue;
        const id = await db.createProductionRole(r);
        if (id) roleIds[r.slug] = id;
      }

      // Seed checklist templates
      const seedTemplates: Array<{ roleSlug: string; periodType: "daily" | "weekly" | "monthly"; title: string; sections: Array<{ title: string; icon: string; items: string[] }>; }> = [
        { roleSlug: "packer", periodType: "daily", title: "Ежедневный чек-лист упаковщика", sections: [
          { title: "Начало смены", icon: "sunrise", items: ["Проверить чистоту рабочего места", "Проверить наличие упаковочных материалов", "Проверить исправность весов и счётчиков", "Ознакомиться с планом на смену"] },
          { title: "В процессе работы", icon: "sun", items: ["Визуальный контроль каждой единицы продукции", "Проверка отсутствия дефектов (облой, недолив, пузыри, деформация)", "Соблюдение нормы укладки в коробку", "Маркировка коробок (артикул, количество, дата, смена)", "Контроль веса выборочных образцов"] },
          { title: "Конец смены", icon: "sunset", items: ["Подсчёт и запись выработки", "Уборка рабочего места", "Передача информации следующей смене", "Сдача бракованной продукции"] },
        ]},
        { roleSlug: "adjuster", periodType: "daily", title: "Ежедневный чек-лист наладчика ТПА", sections: [
          { title: "Начало смены", icon: "sunrise", items: ["Получить информацию от предыдущей смены", "Проверить параметры работы ТПА (температура, давление, цикл)", "Проверить состояние пресс-формы", "Проверить качество первых деталей после запуска"] },
          { title: "В процессе работы", icon: "sun", items: ["Контроль стабильности цикла", "Контроль качества продукции (визуально, по весу)", "Корректировка параметров при отклонениях", "Ведение журнала параметров", "Контроль температуры зон нагрева"] },
          { title: "Конец смены", icon: "sunset", items: ["Проверка стабильности работы ТПА перед передачей", "Запись параметров и замечаний в журнал", "Информирование следующей смены о проблемах"] },
        ]},
        { roleSlug: "mechanic", periodType: "daily", title: "Ежедневный чек-лист механика", sections: [
          { title: "Утренний обход", icon: "sunrise", items: ["Визуальный осмотр всех ТПА", "Проверка уровня масла в гидросистемах", "Проверка состояния шлангов и соединений", "Проверка работы систем охлаждения", "Проверка состояния электрошкафов"] },
          { title: "В течение дня", icon: "sun", items: ["Выполнение заявок на ремонт", "Контроль вибрации и шума оборудования", "Смазка узлов по графику ППР", "Проверка затяжки крепежа пресс-форм", "Ведение журнала ремонтов"] },
          { title: "Конец дня", icon: "sunset", items: ["Проверка выполнения всех заявок", "Отчёт о состоянии оборудования", "Подготовка запчастей на следующий день"] },
        ]},
        { roleSlug: "shift_supervisor", periodType: "daily", title: "Ежедневный чек-лист начальника смены", sections: [
          { title: "Приёмка смены", icon: "sunrise", items: ["Получить информацию от предыдущего начальника смены", "Проверить явку персонала, распределить по рабочим местам", "Ознакомиться с планом производства на смену", "Проверить наличие сырья и упаковочных материалов", "Проверить состояние оборудования (совместно с наладчиками)"] },
          { title: "Контроль в течение смены", icon: "sun", items: ["Контроль выполнения плана производства каждые 2 часа", "Контроль качества продукции (выборочные проверки)", "Контроль соблюдения технологических режимов", "Контроль дисциплины и охраны труда", "Решение оперативных проблем (поломки, дефицит, брак)", "Координация с механиками и наладчиками"] },
          { title: "Сдача смены", icon: "sunset", items: ["Подведение итогов смены (план/факт)", "Заполнение сменного отчёта", "Передача информации следующей смене", "Контроль уборки рабочих мест"] },
        ]},
        { roleSlug: "production_manager", periodType: "daily", title: "Ежедневный чек-лист начальника производства", sections: [
          { title: "Утро (08:00–09:00)", icon: "sunrise", items: ["Просмотр сменных отчётов за прошедшие сутки", "Анализ выполнения плана (план/факт по каждому станку)", "Проверка уровня брака и простоев", "Планёрка с начальниками смен и старшими специалистами", "Проверка наличия сырья на складе"] },
          { title: "День (09:00–16:00)", icon: "sun", items: ["Обход производства (визуальный контроль)", "Контроль выполнения графика ППР", "Работа с рекламациями от клиентов", "Координация с отделом снабжения по сырью", "Контроль технологической дисциплины", "Решение кадровых вопросов"] },
          { title: "Вечер (16:00–17:00)", icon: "sunset", items: ["Анализ итогов дня", "Планирование задач на следующий день", "Контроль заполнения документации", "Отчёт руководству"] },
        ]},
        { roleSlug: "production_manager", periodType: "weekly", title: "Еженедельные задачи начальника производства", sections: [
          { title: "Аналитика", icon: "bar-chart", items: ["Анализ выполнения плана за неделю", "Анализ динамики брака по продуктам и станкам", "Анализ простоев и их причин", "Сравнение KPI с предыдущей неделей"] },
          { title: "Управление", icon: "users", items: ["Совещание с руководителями подразделений", "Планирование производства на следующую неделю", "Контроль графика ППР", "Работа с кадровыми вопросами (графики, отпуска)"] },
        ]},
        { roleSlug: "production_manager", periodType: "monthly", title: "Ежемесячные задачи начальника производства", sections: [
          { title: "Стратегия", icon: "target", items: ["Анализ выполнения месячного плана", "Подготовка отчёта для руководства", "Планирование производства на следующий месяц", "Анализ себестоимости продукции"] },
          { title: "Операции", icon: "settings", items: ["Инвентаризация склада сырья и готовой продукции", "Ревизия состояния пресс-форм", "Обновление технологических карт", "Планирование закупки запчастей и расходных материалов"] },
        ]},
        { roleSlug: "production_director", periodType: "daily", title: "Ежедневный чек-лист директора производства", sections: [
          { title: "Утро", icon: "sunrise", items: ["Просмотр ключевых KPI за прошедшие сутки", "Анализ отклонений от плана", "Совещание с начальником производства"] },
          { title: "День", icon: "sun", items: ["Контроль стратегических показателей", "Работа с ключевыми клиентами и поставщиками", "Принятие решений по инвестициям в оборудование"] },
          { title: "Вечер", icon: "sunset", items: ["Обзор итогов дня", "Планирование стратегических задач"] },
        ]},
        { roleSlug: "shift_assistant", periodType: "daily", title: "Ежедневный чек-лист помощницы начальника смены", sections: [
          { title: "Начало смены", icon: "sunrise", items: ["Проверить явку упаковщиков и распределить по местам", "Проверить наличие упаковочных материалов на линиях", "Получить план на смену от начальника смены", "Проверить чистоту рабочих мест"] },
          { title: "В течение смены", icon: "sun", items: ["Контроль работы упаковщиков (качество, скорость)", "Обеспечение бесперебойной подачи материалов", "Контроль маркировки и комплектации коробок", "Помощь в решении оперативных проблем", "Ведение учёта выработки по каждому упаковщику", "Контроль соблюдения санитарных норм"] },
          { title: "Конец смены", icon: "sunset", items: ["Сбор данных о выработке за смену", "Контроль уборки рабочих мест", "Передача информации начальнику смены", "Подготовка отчёта по упаковке"] },
        ]},
        { roleSlug: "packer_foreman", periodType: "daily", title: "Ежедневный чек-лист бригадира упаковщиков", sections: [
          { title: "Начало смены", icon: "sunrise", items: ["Распределить упаковщиков по линиям", "Проверить запас упаковочных материалов", "Провести инструктаж по текущим заказам", "Проверить исправность упаковочного оборудования"] },
          { title: "В течение смены", icon: "sun", items: ["Контроль качества упаковки на каждой линии", "Контроль скорости работы и выполнения нормы", "Ротация упаковщиков при необходимости", "Контроль правильности маркировки", "Учёт брака упаковки", "Координация с наладчиками при смене продукции"] },
          { title: "Конец смены", icon: "sunset", items: ["Подсчёт общей выработки бригады", "Отчёт начальнику смены о результатах", "Контроль сдачи рабочих мест", "Заявка на упаковочные материалы на следующую смену"] },
        ]},
        { roleSlug: "packer_foreman", periodType: "weekly", title: "Еженедельные задачи бригадира упаковщиков", sections: [
          { title: "Аналитика", icon: "bar-chart", items: ["Анализ выработки каждого упаковщика за неделю", "Анализ брака упаковки", "Оценка расхода упаковочных материалов"] },
          { title: "Управление", icon: "users", items: ["Планирование графика смен упаковщиков", "Обучение новых сотрудников", "Совещание с начальником смены по результатам"] },
        ]},
        { roleSlug: "senior_mechanic", periodType: "daily", title: "Ежедневный чек-лист старшего механика", sections: [
          { title: "Утренний обход", icon: "sunrise", items: ["Получить информацию о состоянии оборудования от ночной смены", "Распределить задачи между механиками", "Проверить выполнение графика ППР на сегодня", "Проверить наличие необходимых запчастей"] },
          { title: "В течение дня", icon: "sun", items: ["Контроль качества ремонтных работ механиков", "Личное участие в сложных ремонтах", "Координация с наладчиками по техническим вопросам", "Ведение журнала ремонтов и замены запчастей", "Контроль соблюдения техники безопасности при ремонтах", "Заказ запчастей при необходимости"] },
          { title: "Конец дня", icon: "sunset", items: ["Проверка выполнения всех заявок на ремонт", "Отчёт начальнику производства о состоянии оборудования", "Планирование работ на следующий день"] },
        ]},
        { roleSlug: "senior_mechanic", periodType: "weekly", title: "Еженедельные задачи старшего механика", sections: [
          { title: "Аналитика", icon: "bar-chart", items: ["Анализ статистики поломок за неделю", "Анализ времени простоев по причине ремонтов (MTTR)", "Контроль расхода запчастей и масел"] },
          { title: "Управление", icon: "users", items: ["Планирование графика ППР на следующую неделю", "Проверка квалификации механиков", "Инвентаризация склада запчастей", "Совещание с начальником производства"] },
        ]},
        { roleSlug: "senior_adjuster", periodType: "daily", title: "Ежедневный чек-лист старшего наладчика ТПА", sections: [
          { title: "Начало рабочего дня", icon: "sunrise", items: ["Получить информацию от предыдущей смены", "Распределить задачи между наладчиками обеих команд", "Проверить технологические карты на текущие заказы", "Проверить параметры работы всех ТПА", "Провести планёрку с наладчиками"] },
          { title: "В течение дня", icon: "sun", items: ["Контроль качества настройки оборудования", "Личное участие в сложных переналадках", "Контроль соблюдения технологических режимов", "Анализ причин брака и корректировка параметров", "Координация с механиками", "Ведение журнала переналадок", "Обучение наладчиков"] },
          { title: "Конец дня", icon: "sunset", items: ["Проверка стабильности работы всех ТПА", "Обновление технологических карт", "Отчёт начальнику производства", "Планирование переналадок на следующий день"] },
        ]},
        { roleSlug: "senior_adjuster", periodType: "weekly", title: "Еженедельные задачи старшего наладчика ТПА", sections: [
          { title: "Аналитика", icon: "bar-chart", items: ["Анализ статистики брака по каждому ТПА", "Анализ стабильности циклов и отклонений", "Оценка состояния пресс-форм"] },
          { title: "Управление", icon: "users", items: ["Планирование переналадок на следующую неделю", "Проверка квалификации наладчиков", "Совещание с начальником производства", "Обновление базы технологических карт"] },
        ]},
      ];

      const existingTemplates = await db.getAllTemplates();
      const existingTemplateKeys = new Set(existingTemplates.map((t) => `${t.roleId}-${t.periodType}`));
      for (const tmpl of seedTemplates) {
        const roleId = roleIds[tmpl.roleSlug];
        if (!roleId) continue;
        if (existingTemplateKeys.has(`${roleId}-${tmpl.periodType}`)) continue;
        const templateId = await db.createTemplate({ roleId, periodType: tmpl.periodType, title: tmpl.title });
        if (!templateId) continue;
        let sortOrder = 0;
        for (const section of tmpl.sections) {
          for (const itemText of section.items) {
            await db.createTemplateItem({ templateId, sectionTitle: section.title, sectionIcon: section.icon, text: itemText, sortOrder: sortOrder++ });
          }
        }
      }

      // Seed 27 machines
      const existingMachines = await db.getAllMachines();
      if (existingMachines.length === 0) {
        for (let i = 1; i <= 27; i++) {
          await db.createMachine({ number: `ТПА-${String(i).padStart(2, "0")}`, name: `Термопластавтомат №${i}` });
        }
      }

      // Seed lookup items for report dropdowns
      const existingLookups = await db.getAllLookups();
      if (existingLookups.length === 0) {
        const lookupData: Array<{ category: string; values: string[] }> = [
          { category: "machines", values: Array.from({ length: 27 }, (_, i) => `ТПА-${String(i + 1).padStart(2, "0")}`) },
          { category: "molds", values: ["Стакан 200мл", "Стакан 300мл", "Стакан 500мл", "Контейнер 250мл", "Контейнер 500мл", "Контейнер 1000мл", "Крышка для стакана", "Крышка для контейнера"] },
          { category: "colors", values: ["Прозрачный", "Белый", "Чёрный", "Красный", "Синий", "Зелёный", "Жёлтый"] },
          { category: "downtime_reasons", values: ["Поломка оборудования", "Переналадка", "Отсутствие сырья", "Отсутствие персонала", "Плановое ТО", "Замена пресс-формы", "Дефект пресс-формы", "Электрическая неисправность", "Гидравлическая неисправность", "Прочее"] },
        ];
        for (const cat of lookupData) {
          let order = 0;
          for (const val of cat.values) {
            await db.createLookupItem({ category: cat.category, value: val, sortOrder: order++ });
          }
        }
      }

      // Seed default permissions
      const allModules = ["checklist", "tasks", "reports", "orders", "recipes", "monitoring", "analytics", "dictionaries"];
      const allRoleSlugs = Object.keys(roleIds);
      await db.seedDefaultPermissions(allRoleSlugs, allModules);

      return { message: `Seeded successfully. Roles: ${Object.keys(roleIds).length}, machines: 27, lookup categories: 4, permissions seeded.` };
    }),
  }),
});

export type AppRouter = typeof appRouter;
