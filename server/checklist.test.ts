import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => {
  const roles = [
    { id: 1, slug: "packer", name: "Упаковщик", description: "Упаковщик готовой продукции", sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, slug: "adjuster", name: "Наладчик ТПА", description: "Наладчик термопластавтоматов", sortOrder: 2, createdAt: new Date(), updatedAt: new Date() },
    { id: 3, slug: "mechanic", name: "Механик", description: "Механик", sortOrder: 3, createdAt: new Date(), updatedAt: new Date() },
    { id: 4, slug: "shift_supervisor", name: "Начальник смены", description: "Начальник смены", sortOrder: 4, createdAt: new Date(), updatedAt: new Date() },
    { id: 5, slug: "production_manager", name: "Начальник производства", description: "Начальник производства", sortOrder: 5, createdAt: new Date(), updatedAt: new Date() },
    { id: 6, slug: "production_director", name: "Директор производства", description: "Директор производства", sortOrder: 6, createdAt: new Date(), updatedAt: new Date() },
    { id: 7, slug: "shift_assistant", name: "Помощница начальника смены", description: "Помощница начальника смены", sortOrder: 7, createdAt: new Date(), updatedAt: new Date() },
    { id: 8, slug: "packer_foreman", name: "Бригадир упаковщиков", description: "Бригадир упаковщиков", sortOrder: 8, createdAt: new Date(), updatedAt: new Date() },
    { id: 9, slug: "senior_mechanic", name: "Старший механик", description: "Старший механик", sortOrder: 9, createdAt: new Date(), updatedAt: new Date() },
    { id: 10, slug: "senior_adjuster", name: "Старший наладчик ТПА", description: "Старший наладчик ТПА", sortOrder: 10, createdAt: new Date(), updatedAt: new Date() },
  ];

  const templates = [
    { id: 1, roleId: 1, periodType: "daily", title: "Ежедневный чек-лист упаковщика", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, roleId: 2, periodType: "daily", title: "Ежедневный чек-лист наладчика", createdAt: new Date(), updatedAt: new Date() },
  ];

  const items = [
    { id: 1, templateId: 1, sectionTitle: "Начало смены", sectionIcon: "sunrise", text: "Проверить чистоту рабочего места", sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, templateId: 1, sectionTitle: "Начало смены", sectionIcon: "sunrise", text: "Проверить наличие упаковочных материалов", sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
  ];

  const instances = [
    { id: 1, templateId: 1, userId: 2, dateKey: "daily-2026-02-18", createdAt: new Date(), updatedAt: new Date() },
  ];

  const instanceItemsData = [
    { id: 1, instanceId: 1, templateItemId: 1, checked: false, note: null, checkedAt: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, instanceId: 1, templateItemId: 2, checked: true, note: "Всё в порядке", checkedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
  ];

  const users = [
    { id: 1, openId: "admin-1", name: "Админ", email: "admin@test.com", loginMethod: "manus", role: "admin", productionRole: "production_manager", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 2, openId: "user-1", name: "Иванов", email: "ivanov@test.com", loginMethod: "manus", role: "user", productionRole: "packer", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 3, openId: "director-1", name: "Директор", email: "director@test.com", loginMethod: "manus", role: "user", productionRole: "production_director", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 4, openId: "shift-sup-1", name: "Начальник смены", email: "shift@test.com", loginMethod: "manus", role: "user", productionRole: "shift_supervisor", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  ];

  const tasks = [
    { id: 1, title: "Проверить станок 5", description: "Описание", assignedTo: 2, assignedBy: 1, status: "pending", priority: "medium", deadline: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, title: "Отчёт за неделю", description: null, assignedTo: 4, assignedBy: 1, status: "in_progress", priority: "high", deadline: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 3, title: "Задача для Иванова", description: null, assignedTo: 2, assignedBy: 3, status: "completed", priority: "low", deadline: null, createdAt: new Date(), updatedAt: new Date() },
  ];

  const machines = [
    { id: 1, number: "ТПА-01", name: "Термопластавтомат 1", status: "running", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, number: "ТПА-02", name: "Термопластавтомат 2", status: "idle", createdAt: new Date(), updatedAt: new Date() },
  ];

  const orders = [
    { id: 1, machineId: 1, product: "Стакан 200мл", color: "Прозрачный", quantity: 10000, completedQty: 5000, moldName: "ПФ-200", rawMaterial: "ПП 01030", status: "in_progress", notes: null, createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, machineId: 2, product: "Контейнер 500мл", color: null, quantity: 5000, completedQty: 0, moldName: null, rawMaterial: null, status: "pending", notes: null, createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
  ];

  const recipes = [
    { id: 1, name: "ПП прозрачный", product: "Стакан 200мл", description: "Основной рецепт", createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "ПП белый", product: "Контейнер 500мл", description: null, createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
  ];

  const recipeComponents = [
    { id: 1, recipeId: 1, materialName: "ПП 01030", percentage: "85", weightKg: "42.5", notes: "Основа", sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, recipeId: 1, materialName: "Краситель", percentage: "15", weightKg: "7.5", notes: null, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
  ];

  const lookups = [
    { id: 1, category: "machines", value: "ТПА-01", sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, category: "machines", value: "ТПА-02", sortOrder: 1, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 3, category: "colors", value: "Прозрачный", sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: 4, category: "downtime_reasons", value: "Поломка", sortOrder: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ];

  const shiftReports = [
    { id: 1, userId: 4, shiftDate: "2026-02-18", shiftNumber: 1, notes: "Без замечаний", createdAt: new Date(), updatedAt: new Date() },
  ];

  const shiftReportRows = [
    { id: 1, reportId: 1, machineNumber: "ТПА-01", moldProduct: "Стакан 200мл", productColor: "Прозрачный", planQty: 10000, actualQty: 9500, standardCycle: 5.2, actualCycle: 5.5, downtimeMin: 30, downtimeReason: "Поломка", defectKg: 2.5, changeover: 15, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
  ];

  return {
    getDb: vi.fn().mockResolvedValue({}),
    // Roles
    getAllProductionRoles: vi.fn().mockResolvedValue(roles),
    createProductionRole: vi.fn().mockResolvedValue(10),
    // Users
    getAllUsers: vi.fn().mockResolvedValue(users),
    setUserProductionRole: vi.fn().mockResolvedValue(undefined),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn().mockResolvedValue(users[0]),
    // Templates
    getAllTemplates: vi.fn().mockResolvedValue(templates),
    getTemplatesForRole: vi.fn().mockImplementation((roleId: number) =>
      Promise.resolve(templates.filter((t) => t.roleId === roleId))
    ),
    createTemplate: vi.fn().mockResolvedValue(10),
    updateTemplate: vi.fn().mockResolvedValue(undefined),
    getTemplateItems: vi.fn().mockImplementation((templateId: number) =>
      Promise.resolve(items.filter((i) => i.templateId === templateId))
    ),
    getAllTemplateItems: vi.fn().mockResolvedValue(items),
    createTemplateItem: vi.fn().mockResolvedValue(10),
    updateTemplateItem: vi.fn().mockResolvedValue(undefined),
    deleteTemplateItem: vi.fn().mockResolvedValue(undefined),
    // Instances
    getOrCreateInstance: vi.fn().mockResolvedValue(instances[0]),
    getInstanceItems: vi.fn().mockResolvedValue(instanceItemsData),
    toggleInstanceItem: vi.fn().mockResolvedValue(undefined),
    setInstanceItemNote: vi.fn().mockResolvedValue(undefined),
    getAllInstancesForPeriod: vi.fn().mockResolvedValue(instances),
    // Analytics
    getChecklistHistory: vi.fn().mockResolvedValue([
      { date: "2026-02-18", total: 10, completed: 8, userName: "Иванов", roleName: "Упаковщик" },
    ]),
    // Tasks
    getAllTasks: vi.fn().mockResolvedValue(tasks),
    getTasksForUser: vi.fn().mockImplementation((userId: number) =>
      Promise.resolve(tasks.filter((t) => t.assignedTo === userId))
    ),
    createTask: vi.fn().mockResolvedValue(10),
    updateTask: vi.fn().mockResolvedValue(undefined),
    updateTaskStatus: vi.fn().mockResolvedValue(undefined),
    // Lookups
    getLookupsByCategory: vi.fn().mockImplementation((category: string) =>
      Promise.resolve(lookups.filter((l) => l.category === category))
    ),
    getAllLookups: vi.fn().mockResolvedValue(lookups),
    createLookupItem: vi.fn().mockResolvedValue(10),
    updateLookupItem: vi.fn().mockResolvedValue(undefined),
    deleteLookupItem: vi.fn().mockResolvedValue(undefined),
    // Reports
    getAllShiftReports: vi.fn().mockResolvedValue(shiftReports),
    getShiftReportById: vi.fn().mockResolvedValue(shiftReports[0]),
    getShiftReportRows: vi.fn().mockResolvedValue(shiftReportRows),
    createShiftReport: vi.fn().mockResolvedValue(10),
    createShiftReportRow: vi.fn().mockResolvedValue(10),
    updateShiftReportRow: vi.fn().mockResolvedValue(undefined),
    deleteShiftReportRow: vi.fn().mockResolvedValue(undefined),
    getReportAnalytics: vi.fn().mockResolvedValue([
      { product: "Стакан 200мл", avgCycleDiff: 0.3, totalDowntime: 30, totalDefect: 2.5, totalChangeover: 15, reportCount: 1 },
    ]),
    // Machines
    getAllMachines: vi.fn().mockResolvedValue(machines),
    createMachine: vi.fn().mockResolvedValue(10),
    updateMachineStatus: vi.fn().mockResolvedValue(undefined),
    // Orders
    getAllOrders: vi.fn().mockResolvedValue(orders),
    getOrdersForMachine: vi.fn().mockImplementation((machineId: number) =>
      Promise.resolve(orders.filter((o) => o.machineId === machineId))
    ),
    getActiveOrderForMachine: vi.fn().mockResolvedValue(orders[0]),
    createOrder: vi.fn().mockResolvedValue(10),
    updateOrder: vi.fn().mockResolvedValue(undefined),
    updateOrderStatus: vi.fn().mockResolvedValue(undefined),
    getOrderById: vi.fn().mockImplementation((id: number) =>
      Promise.resolve(orders.find((o) => o.id === id) ?? null)
    ),
    incrementOrderCompletedQty: vi.fn().mockResolvedValue(undefined),
    decrementOrderCompletedQty: vi.fn().mockResolvedValue(undefined),
    getShiftReportRowById: vi.fn().mockResolvedValue(shiftReportRows[0]),
    deleteShiftReport: vi.fn().mockResolvedValue(undefined),
    getMoldsForProduct: vi.fn().mockResolvedValue([]),
    updateProductionRole: vi.fn().mockResolvedValue(undefined),
    // Recipes
    getAllRecipes: vi.fn().mockResolvedValue(recipes),
    getRecipeById: vi.fn().mockResolvedValue(recipes[0]),
    getRecipeComponents: vi.fn().mockResolvedValue(recipeComponents),
    createRecipe: vi.fn().mockResolvedValue(10),
    updateRecipe: vi.fn().mockResolvedValue(undefined),
    deleteRecipe: vi.fn().mockResolvedValue(undefined),
    createRecipeComponent: vi.fn().mockResolvedValue(10),
    updateRecipeComponent: vi.fn().mockResolvedValue(undefined),
    deleteRecipeComponent: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1, openId: "admin-1", email: "admin@test.com", name: "Админ",
    loginMethod: "manus", role: "admin", productionRole: "production_manager",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] };
}

function createEmployeeContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2, openId: "user-1", email: "ivanov@test.com", name: "Иванов",
    loginMethod: "manus", role: "user", productionRole: "packer",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] };
}

function createDirectorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3, openId: "director-1", email: "director@test.com", name: "Директор",
    loginMethod: "manus", role: "user", productionRole: "production_director",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] };
}

function createShiftSupervisorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 4, openId: "shift-sup-1", email: "shift@test.com", name: "Начальник смены",
    loginMethod: "manus", role: "user", productionRole: "shift_supervisor",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] };
}

function createUnauthContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] };
}

// ============ ROLES ============

describe("roles.list", () => {
  it("returns all 10 production roles", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const roles = await caller.roles.list();
    expect(roles).toHaveLength(10);
    expect(roles[0].slug).toBe("packer");
    expect(roles[5].slug).toBe("production_director");
  });

  it("returns roles even for unauthenticated users", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    const roles = await caller.roles.list();
    expect(roles).toHaveLength(10);
  });
});

describe("roles.create", () => {
  it("allows admin to create a role", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.roles.create({ slug: "test_role", name: "Тестовая роль", description: "Тест" });
    expect(result).toHaveProperty("id");
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    await expect(caller.roles.create({ slug: "test", name: "Test" })).rejects.toThrow();
  });
});

// ============ TEMPLATES ============

describe("templates.list", () => {
  it("returns all templates for authenticated user", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const templates = await caller.templates.list();
    expect(templates).toHaveLength(2);
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.templates.list()).rejects.toThrow();
  });
});

describe("templates.listForRole", () => {
  it("returns templates filtered by role", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const templates = await caller.templates.listForRole({ roleId: 1 });
    expect(templates).toHaveLength(1);
    expect(templates[0].roleId).toBe(1);
  });
});

describe("templates.items", () => {
  it("returns template items for a given template", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const items = await caller.templates.items({ templateId: 1 });
    expect(items).toHaveLength(2);
    expect(items[0].sectionTitle).toBe("Начало смены");
  });
});

describe("templates.addItem (admin)", () => {
  it("allows admin to add a template item", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.templates.addItem({ templateId: 1, sectionTitle: "Тестовая секция", text: "Тестовый пункт", sortOrder: 10 });
    expect(result).toHaveProperty("id");
  });
});

describe("templates.updateItem (admin)", () => {
  it("allows admin to update a template item text", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.templates.updateItem({ id: 1, text: "Обновлённый текст" });
    expect(result).toEqual({ success: true });
  });
});

describe("templates.deleteItem (admin)", () => {
  it("allows admin to delete a template item", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.templates.deleteItem({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ============ INSTANCES ============

describe("instances.getOrCreate", () => {
  it("returns or creates an instance for the user", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const instance = await caller.instances.getOrCreate({ templateId: 1, dateKey: "daily-2026-02-18" });
    expect(instance).toHaveProperty("id");
    expect(instance?.templateId).toBe(1);
  });
});

describe("instances.items", () => {
  it("returns instance items", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const items = await caller.instances.items({ instanceId: 1 });
    expect(items).toHaveLength(2);
    expect(items[0].checked).toBe(false);
    expect(items[1].checked).toBe(true);
  });
});

describe("instances.toggleItem", () => {
  it("toggles an item's checked state", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const result = await caller.instances.toggleItem({ itemId: 1, checked: true });
    expect(result).toEqual({ success: true });
  });
});

describe("instances.setNote", () => {
  it("sets a note on an instance item", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const result = await caller.instances.setNote({ itemId: 1, note: "Тестовая заметка" });
    expect(result).toEqual({ success: true });
  });
});

// ============ DASHBOARD ACCESS CONTROL ============

describe("dashboard.overview — access control", () => {
  it("allows admin to access dashboard", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const overview = await caller.dashboard.overview({ periodType: "daily" });
    expect(overview).toBeInstanceOf(Array);
  });

  it("allows production_director to access dashboard", async () => {
    const caller = appRouter.createCaller(createDirectorContext());
    const overview = await caller.dashboard.overview({ periodType: "daily" });
    expect(overview).toBeInstanceOf(Array);
  });

  it("rejects regular employee (packer) from dashboard", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    await expect(caller.dashboard.overview({ periodType: "daily" })).rejects.toThrow();
  });

  it("rejects shift_supervisor from dashboard", async () => {
    const caller = appRouter.createCaller(createShiftSupervisorContext());
    await expect(caller.dashboard.overview({ periodType: "daily" })).rejects.toThrow();
  });

  it("rejects unauthenticated users from dashboard", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.dashboard.overview({ periodType: "daily" })).rejects.toThrow();
  });
});

// ============ USER MANAGEMENT ============

describe("users.list (admin)", () => {
  it("returns all users for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const users = await caller.users.list();
    expect(users).toHaveLength(4);
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    await expect(caller.users.list()).rejects.toThrow();
  });
});

describe("users.setProductionRole (admin)", () => {
  it("allows admin to set a user's production role", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.users.setProductionRole({ userId: 2, productionRole: "adjuster" });
    expect(result).toEqual({ success: true });
  });

  it("allows admin to clear a user's production role", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.users.setProductionRole({ userId: 2, productionRole: null });
    expect(result).toEqual({ success: true });
  });

  it("rejects non-admin from setting roles", async () => {
    const caller = appRouter.createCaller(createDirectorContext());
    await expect(caller.users.setProductionRole({ userId: 2, productionRole: "mechanic" })).rejects.toThrow();
  });
});

// ============ TASKS ============

describe("tasks.list", () => {
  it("returns all tasks for manager", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const taskList = await caller.tasks.list();
    expect(taskList).toHaveLength(3);
  });

  it("returns only assigned tasks for regular employee", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const taskList = await caller.tasks.list();
    expect(taskList).toHaveLength(2);
    expect(taskList.every((t: any) => t.assignedTo === 2)).toBe(true);
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.tasks.list()).rejects.toThrow();
  });
});

describe("tasks.create", () => {
  it("allows authenticated user to create a task", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.tasks.create({
      title: "Новая задача",
      description: "Описание",
      assigneeId: 2,
      priority: "high",
    });
    expect(result).toHaveProperty("id");
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.tasks.create({ title: "Test", assigneeId: 2, priority: "medium" })).rejects.toThrow();
  });
});

describe("tasks.updateStatus", () => {
  it("allows updating task status", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const result = await caller.tasks.updateStatus({ taskId: 1, status: "completed" });
    expect(result).toEqual({ success: true });
  });
});

// ============ LOOKUPS ============

describe("lookups.byCategory", () => {
  it("returns lookups filtered by category", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const result = await caller.lookups.byCategory({ category: "machines" });
    expect(result).toHaveLength(2);
    expect(result[0].category).toBe("machines");
  });
});

describe("lookups.all", () => {
  it("returns all lookups", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const result = await caller.lookups.all();
    expect(result).toHaveLength(4);
  });
});

describe("lookups.create (admin)", () => {
  it("allows admin to create a lookup item", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.lookups.create({ category: "colors", value: "Белый" });
    expect(result).toHaveProperty("id");
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    await expect(caller.lookups.create({ category: "colors", value: "Белый" })).rejects.toThrow();
  });
});

describe("lookups.delete (admin)", () => {
  it("allows admin to delete a lookup item", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.lookups.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ============ REPORTS ============

describe("reports.list", () => {
  it("returns all reports for manager", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const reports = await caller.reports.list();
    expect(reports).toHaveLength(1);
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.reports.list()).rejects.toThrow();
  });
});

describe("reports.get", () => {
  it("returns a report by id with rows", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.reports.get({ id: 1 });
    expect(result).toHaveProperty("report");
    expect(result).toHaveProperty("rows");
    expect(result.report?.shiftDate).toBe("2026-02-18");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].machineNumber).toBe("ТПА-01");
  });
});

describe("reports.create", () => {
  it("allows authenticated user to create a report", async () => {
    const caller = appRouter.createCaller(createShiftSupervisorContext());
    const result = await caller.reports.create({ shiftDate: "2026-02-19", shiftNumber: 2, notes: "Тест" });
    expect(result).toHaveProperty("id");
  });
});

describe("reports.addRow", () => {
  it("allows adding a row to a report", async () => {
    const caller = appRouter.createCaller(createShiftSupervisorContext());
    const result = await caller.reports.addRow({
      reportId: 1, machineNumber: "ТПА-03", moldProduct: "Контейнер", productColor: "Белый",
      planQty: 5000, actualQty: 4800, standardCycle: "6.0", actualCycle: "6.2",
      downtimeMin: 10, downtimeReason: "Переналадка", defectKg: "1.0", changeover: 20,
    });
    expect(result).toHaveProperty("id");
  });
});

describe("reports.analytics", () => {
  it("returns analytics data", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.reports.analytics({ moldProduct: "Стакан 200мл" });
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("avgCycleDiff");
    expect(result[0]).toHaveProperty("totalDowntime");
  });
});

// ============ MACHINES ============

describe("machines.list", () => {
  it("returns all machines", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const result = await caller.machines.list();
    expect(result).toHaveLength(2);
    expect(result[0].number).toBe("ТПА-01");
  });

  it("rejects unauthenticated users", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.machines.list()).rejects.toThrow();
  });
});

// ============ ORDERS ============

describe("orders.list", () => {
  it("returns all orders", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const result = await caller.orders.list();
    expect(result).toHaveLength(2);
    expect(result[0].product).toBe("Стакан 200мл");
  });
});

describe("orders.forMachine", () => {
  it("returns orders for a specific machine", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const result = await caller.orders.forMachine({ machineId: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].machineId).toBe(1);
  });
});

describe("orders.create (manager)", () => {
  it("allows manager to create an order", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.orders.create({ machineId: 1, product: "Стакан 300мл", quantity: 8000 });
    expect(result).toHaveProperty("id");
  });

  it("rejects non-manager users", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    await expect(caller.orders.create({ machineId: 1, product: "Тест", quantity: 100 })).rejects.toThrow();
  });
});

describe("orders.updateStatus", () => {
  it("allows updating order status", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const result = await caller.orders.updateStatus({ orderId: 1, status: "completed" });
    expect(result).toEqual({ success: true });
  });
});

// ============ RECIPES ============

describe("recipes.list", () => {
  it("returns all recipes", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const result = await caller.recipes.list();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("ПП прозрачный");
  });
});

describe("recipes.get", () => {
  it("returns recipe with components", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const result = await caller.recipes.get({ id: 1 });
    expect(result).toHaveProperty("recipe");
    expect(result).toHaveProperty("components");
    expect(result.recipe?.name).toBe("ПП прозрачный");
    expect(result.components).toHaveLength(2);
    expect(result.components[0].materialName).toBe("ПП 01030");
  });
});

describe("recipes.create", () => {
  it("allows creating a recipe", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const result = await caller.recipes.create({ name: "Новый рецепт", product: "Тест" });
    expect(result).toHaveProperty("id");
  });
});

describe("recipes.addComponent", () => {
  it("allows adding a component to a recipe", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const result = await caller.recipes.addComponent({ recipeId: 1, materialName: "Добавка", percentage: "5" });
    expect(result).toHaveProperty("id");
  });
});

describe("recipes.delete", () => {
  it("allows deleting a recipe", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const result = await caller.recipes.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("recipes.deleteComponent", () => {
  it("allows deleting a component", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const result = await caller.recipes.deleteComponent({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

// ============ ANALYTICS ============

describe("analytics.checklistHistory", () => {
  it("returns checklist history for manager", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.analytics.checklistHistory({
      dateFrom: "2026-02-01",
      dateTo: "2026-02-28",
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("date");
    expect(result[0]).toHaveProperty("total");
    expect(result[0]).toHaveProperty("completed");
  });

  it("rejects non-manager users", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    await expect(
      caller.analytics.checklistHistory({ dateFrom: "2026-02-01", dateTo: "2026-02-28" })
    ).rejects.toThrow();
  });
});
