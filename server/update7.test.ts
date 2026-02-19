import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => {
  const materialRequests = [
    { id: 1, orderId: 1, product: "Стакан 200мл", baseWeightKg: "50", status: "pending", notes: null, createdAt: new Date(), updatedAt: new Date() },
  ];

  const materialRequestItems = [
    { id: 1, requestId: 1, materialName: "Hyosung R901", percentage: "50", calculatedKg: "25", actualKg: null, batchNumber: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, requestId: 1, materialName: "Китай K1980", percentage: "50", calculatedKg: "25", actualKg: null, batchNumber: null, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
  ];

  const customFields = [
    { id: 1, name: "humidity", label: "Влажность", fieldType: "decimal", isRequired: false, isActive: true, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, name: "temperature", label: "Температура", fieldType: "number", isRequired: true, isActive: true, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
  ];

  const roles = [
    { id: 1, slug: "packer", name: "Упаковщик", description: "Упаковщик", sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
    { id: 5, slug: "production_manager", name: "Начальник производства", description: "Начальник производства", sortOrder: 5, createdAt: new Date(), updatedAt: new Date() },
    { id: 6, slug: "production_director", name: "Директор производства", description: "Директор производства", sortOrder: 6, createdAt: new Date(), updatedAt: new Date() },
  ];

  const machines = [
    { id: 1, number: "ТПА-01", name: "Термопластавтомат 1", status: "running", createdAt: new Date(), updatedAt: new Date() },
  ];

  const orders = [
    { id: 1, machineId: 1, product: "Стакан 200мл", color: "Белый", quantity: 10000, completedQty: 5000, moldName: "ПФ-200", status: "in_progress", notes: null, createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
  ];

  const lookups = [
    { id: 1, category: "machines", value: "ТПА-01", sortOrder: 0, isActive: true, parentProduct: null, standardWeight: null, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, category: "molds", value: "ПФ-200", sortOrder: 0, isActive: true, parentProduct: "Стакан 200мл", standardWeight: "12.5", createdAt: new Date(), updatedAt: new Date() },
  ];

  const recipes = [
    { id: 1, name: "ПП прозрачный", product: "Стакан 200мл", description: "Основной рецепт", createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
  ];

  const recipeComponents = [
    { id: 1, recipeId: 1, materialName: "Hyosung R901", percentage: "50", weightKg: "25", notes: null, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, recipeId: 1, materialName: "Китай K1980", percentage: "50", weightKg: "25", notes: null, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
  ];

  const shiftReports = [
    { id: 1, userId: 4, shiftDate: "2026-02-18", shiftNumber: 1, notes: null, createdAt: new Date(), updatedAt: new Date() },
  ];

  const shiftReportRows = [
    { id: 1, reportId: 1, orderId: 1, machineNumber: "ТПА-01", moldProduct: "Стакан 200мл", productColor: "Белый", planQty: 10000, actualQty: 100, standardCycle: "5.2", actualCycle: "5.5", downtimeMin: 0, downtimeReason: null, defectKg: "0", changeover: 0, standardWeight: "12.5", avgWeight: "12.3", sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
  ];

  const users = [
    { id: 1, openId: "admin-1", name: "Админ", email: "admin@test.com", loginMethod: "manus", role: "admin", productionRole: "production_manager", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 2, openId: "user-1", name: "Иванов", email: "ivanov@test.com", loginMethod: "manus", role: "user", productionRole: "packer", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 3, openId: "director-1", name: "Директор", email: "director@test.com", loginMethod: "manus", role: "user", productionRole: "production_director", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    { id: 4, openId: "shift-sup-1", name: "Начальник смены", email: "shift@test.com", loginMethod: "manus", role: "user", productionRole: "shift_supervisor", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  ];

  const templates: any[] = [];
  const items: any[] = [];
  const instances: any[] = [];
  const instanceItemsData: any[] = [];
  const tasks: any[] = [];

  return {
    getDb: vi.fn().mockResolvedValue({}),
    // Roles
    getAllProductionRoles: vi.fn().mockResolvedValue(roles),
    createProductionRole: vi.fn().mockResolvedValue(10),
    updateProductionRole: vi.fn().mockResolvedValue(undefined),
    // Users
    getAllUsers: vi.fn().mockResolvedValue(users),
    setUserProductionRole: vi.fn().mockResolvedValue(undefined),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn().mockResolvedValue(users[0]),
    // Templates
    getAllTemplates: vi.fn().mockResolvedValue(templates),
    getTemplatesForRole: vi.fn().mockResolvedValue([]),
    createTemplate: vi.fn().mockResolvedValue(10),
    updateTemplate: vi.fn().mockResolvedValue(undefined),
    getTemplateItems: vi.fn().mockResolvedValue(items),
    getAllTemplateItems: vi.fn().mockResolvedValue(items),
    createTemplateItem: vi.fn().mockResolvedValue(10),
    updateTemplateItem: vi.fn().mockResolvedValue(undefined),
    deleteTemplateItem: vi.fn().mockResolvedValue(undefined),
    // Instances
    getOrCreateInstance: vi.fn().mockResolvedValue(null),
    getInstanceItems: vi.fn().mockResolvedValue(instanceItemsData),
    toggleInstanceItem: vi.fn().mockResolvedValue(undefined),
    setInstanceItemNote: vi.fn().mockResolvedValue(undefined),
    getAllInstancesForPeriod: vi.fn().mockResolvedValue(instances),
    // Analytics
    getChecklistHistory: vi.fn().mockResolvedValue([]),
    // Tasks
    getAllTasks: vi.fn().mockResolvedValue(tasks),
    getTasksForUser: vi.fn().mockResolvedValue([]),
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
    updateLookupItemFull: vi.fn().mockResolvedValue(undefined),
    deleteLookupItem: vi.fn().mockResolvedValue(undefined),
    createLookupItemsBulk: vi.fn().mockResolvedValue(undefined),
    getMoldsForProduct: vi.fn().mockResolvedValue([lookups[1]]),
    // Reports
    getAllShiftReports: vi.fn().mockResolvedValue(shiftReports),
    getShiftReportById: vi.fn().mockResolvedValue(shiftReports[0]),
    getShiftReportRows: vi.fn().mockResolvedValue(shiftReportRows),
    createShiftReport: vi.fn().mockResolvedValue(10),
    createShiftReportRow: vi.fn().mockResolvedValue(10),
    updateShiftReportRow: vi.fn().mockResolvedValue(undefined),
    deleteShiftReportRow: vi.fn().mockResolvedValue(undefined),
    getShiftReportRowById: vi.fn().mockResolvedValue(shiftReportRows[0]),
    deleteShiftReport: vi.fn().mockResolvedValue(undefined),
    getReportAnalytics: vi.fn().mockResolvedValue([]),
    // Machines
    getAllMachines: vi.fn().mockResolvedValue(machines),
    createMachine: vi.fn().mockResolvedValue(10),
    updateMachineStatus: vi.fn().mockResolvedValue(undefined),
    // Orders
    getAllOrders: vi.fn().mockResolvedValue(orders),
    getOrdersForMachine: vi.fn().mockResolvedValue(orders),
    getActiveOrderForMachine: vi.fn().mockResolvedValue(orders[0]),
    createOrder: vi.fn().mockResolvedValue(10),
    updateOrder: vi.fn().mockResolvedValue(undefined),
    updateOrderStatus: vi.fn().mockResolvedValue(undefined),
    getOrderById: vi.fn().mockImplementation((id: number) =>
      Promise.resolve(orders.find((o) => o.id === id) ?? null)
    ),
    incrementOrderCompletedQty: vi.fn().mockResolvedValue(undefined),
    decrementOrderCompletedQty: vi.fn().mockResolvedValue(undefined),
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
    getRecipeByProduct: vi.fn().mockResolvedValue(recipes[0]),
    getRecipesForProduct: vi.fn().mockResolvedValue(recipes),
    // Permissions
    getPermissionsForRole: vi.fn().mockResolvedValue([]),
    setPermission: vi.fn().mockResolvedValue(undefined),
    getPermissionsForUser: vi.fn().mockResolvedValue([]),
    // Material Requests
    getAllMaterialRequests: vi.fn().mockResolvedValue(materialRequests),
    getMaterialRequestById: vi.fn().mockImplementation((id: number) =>
      Promise.resolve(materialRequests.find((r) => r.id === id) ?? null)
    ),
    getMaterialRequestByOrderId: vi.fn().mockImplementation((orderId: number) =>
      Promise.resolve(materialRequests.find((r) => r.orderId === orderId) ?? null)
    ),
    createMaterialRequest: vi.fn().mockResolvedValue(10),
    updateMaterialRequest: vi.fn().mockResolvedValue(undefined),
    getMaterialRequestItems: vi.fn().mockResolvedValue(materialRequestItems),
    addMaterialRequestItem: vi.fn().mockResolvedValue(10),
    updateMaterialRequestItem: vi.fn().mockResolvedValue(undefined),
    deleteMaterialRequestItem: vi.fn().mockResolvedValue(undefined),
    // Custom Fields
    getAllCustomReportFields: vi.fn().mockResolvedValue(customFields),
    getActiveCustomReportFields: vi.fn().mockResolvedValue(customFields),
    createCustomReportField: vi.fn().mockResolvedValue(10),
    updateCustomReportField: vi.fn().mockResolvedValue(undefined),
    deleteCustomReportField: vi.fn().mockResolvedValue(undefined),
    // Production Analytics
    getProductAnalytics: vi.fn().mockResolvedValue([
      { product: "Стакан 200мл", orderCount: 5, totalQty: 50000, totalCompleted: 25000 },
      { product: "Контейнер 500мл", orderCount: 3, totalQty: 15000, totalCompleted: 10000 },
    ]),
    getMaterialAnalytics: vi.fn().mockResolvedValue([
      { materialName: "Hyosung R901", requestCount: 5, totalCalcKg: "125", totalActualKg: "120" },
      { materialName: "Китай K1980", requestCount: 5, totalCalcKg: "125", totalActualKg: "130" },
    ]),
    getOrderAnalytics: vi.fn().mockResolvedValue([
      { id: 1, machineId: 1, machineName: "ТПА-01", product: "Стакан 200мл", quantity: 10000, completedQty: 5000, status: "in_progress" },
    ]),
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

function createManagerContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3, openId: "director-1", email: "director@test.com", name: "Директор",
    loginMethod: "manus", role: "user", productionRole: "production_director",
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

// ============ MATERIAL REQUESTS ============

describe("materialRequests.list", () => {
  it("returns all material requests for authenticated user", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.materialRequests.list();
    expect(result).toHaveLength(1);
    expect(result[0].product).toBe("Стакан 200мл");
  });
});

describe("materialRequests.get", () => {
  it("returns material request with items by id", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.materialRequests.get({ id: 1 });
    expect(result.request).toBeDefined();
    expect(result.request?.product).toBe("Стакан 200мл");
    expect(result.items).toHaveLength(2);
    expect(result.items[0].materialName).toBe("Hyosung R901");
    expect(result.items[0].percentage).toBe("50");
  });
});

describe("materialRequests.getByOrder", () => {
  it("returns material request by order id", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.materialRequests.getByOrder({ orderId: 1 });
    expect(result.request).toBeDefined();
    expect(result.items).toHaveLength(2);
  });
});

describe("materialRequests.update", () => {
  it("updates material request status", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.materialRequests.update({ id: 1, status: "in_progress" });
    expect(result.success).toBe(true);
  });

  it("updates base weight", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.materialRequests.update({ id: 1, baseWeightKg: "100" });
    expect(result.success).toBe(true);
  });
});

describe("materialRequests.updateItem", () => {
  it("updates actual kg and batch number", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.materialRequests.updateItem({ id: 1, actualKg: "24.5", batchNumber: "LOT-2026-001" });
    expect(result.success).toBe(true);
  });
});

describe("materialRequests.addItem", () => {
  it("adds a new material item to request", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.materialRequests.addItem({
      requestId: 1,
      materialName: "Краситель чёрный",
      percentage: "1",
      calculatedKg: "0.5",
    });
    expect(result.id).toBe(10);
  });
});

describe("materialRequests.deleteItem", () => {
  it("deletes a material item", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.materialRequests.deleteItem({ id: 1 });
    expect(result.success).toBe(true);
  });
});

describe("materialRequests.recalculate", () => {
  it("recalculates all items based on new base weight", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.materialRequests.recalculate({ requestId: 1, baseWeightKg: "100" });
    expect(result.success).toBe(true);
  });
});

// ============ CUSTOM REPORT FIELDS ============

describe("customFields.list", () => {
  it("returns all custom fields", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.customFields.list();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("humidity");
    expect(result[1].name).toBe("temperature");
  });
});

describe("customFields.active", () => {
  it("returns only active custom fields", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.customFields.active();
    expect(result).toHaveLength(2);
  });
});

describe("customFields.create", () => {
  it("allows manager to create custom field", async () => {
    const caller = appRouter.createCaller(createManagerContext());
    const result = await caller.customFields.create({
      name: "pressure",
      label: "Давление",
      fieldType: "decimal",
      isRequired: false,
    });
    expect(result.id).toBe(10);
  });

  it("denies regular employee from creating custom field", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    await expect(
      caller.customFields.create({
        name: "pressure",
        label: "Давление",
        fieldType: "decimal",
      })
    ).rejects.toThrow();
  });
});

describe("customFields.update", () => {
  it("allows manager to update custom field", async () => {
    const caller = appRouter.createCaller(createManagerContext());
    const result = await caller.customFields.update({ id: 1, label: "Влажность (%)", isRequired: true });
    expect(result.success).toBe(true);
  });
});

describe("customFields.delete", () => {
  it("allows manager to delete custom field", async () => {
    const caller = appRouter.createCaller(createManagerContext());
    const result = await caller.customFields.delete({ id: 1 });
    expect(result.success).toBe(true);
  });

  it("denies regular employee from deleting custom field", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    await expect(caller.customFields.delete({ id: 1 })).rejects.toThrow();
  });
});

// ============ PRODUCTION ANALYTICS ============

describe("productionAnalytics.products", () => {
  it("returns product analytics data", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.productionAnalytics.products();
    expect(result).toHaveLength(2);
    expect(result[0].product).toBe("Стакан 200мл");
    expect(result[0].orderCount).toBe(5);
    expect(result[0].totalQty).toBe(50000);
    expect(result[0].totalCompleted).toBe(25000);
  });
});

describe("productionAnalytics.materials", () => {
  it("returns material analytics data", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.productionAnalytics.materials();
    expect(result).toHaveLength(2);
    expect(result[0].materialName).toBe("Hyosung R901");
    expect(result[0].requestCount).toBe(5);
  });
});

describe("productionAnalytics.orders", () => {
  it("returns order analytics data", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.productionAnalytics.orders();
    expect(result).toHaveLength(1);
    expect(result[0].machineName).toBe("ТПА-01");
  });
});

// ============ LOOKUPS WITH STANDARD WEIGHT ============

describe("lookups.update with standardWeight", () => {
  it("allows admin to update lookup with standardWeight", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.lookups.update({ id: 2, standardWeight: "15.0" });
    expect(result.success).toBe(true);
  });
});

describe("lookups.update with parentProduct", () => {
  it("allows admin to update lookup with parentProduct", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.lookups.update({ id: 2, parentProduct: "Стакан 500мл" });
    expect(result.success).toBe(true);
  });
});

// ============ MOLDS FOR PRODUCT ============

describe("lookups.moldsForProduct", () => {
  it("returns molds linked to a specific product", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.lookups.moldsForProduct({ product: "Стакан 200мл" });
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("ПФ-200");
    expect(result[0].parentProduct).toBe("Стакан 200мл");
  });
});

// ============ ROLE CRUD ============

describe("roles.update", () => {
  it("allows manager to update role name", async () => {
    const caller = appRouter.createCaller(createManagerContext());
    const result = await caller.roles.update({ id: 1, name: "Старший упаковщик" });
    expect(result.success).toBe(true);
  });

  it("denies regular employee from updating roles", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    await expect(caller.roles.update({ id: 1, name: "Хакер" })).rejects.toThrow();
  });
});
