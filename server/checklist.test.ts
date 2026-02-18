import { describe, expect, it, vi, beforeEach } from "vitest";
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

  return {
    getDb: vi.fn().mockResolvedValue({}),
    getAllProductionRoles: vi.fn().mockResolvedValue(roles),
    createProductionRole: vi.fn().mockResolvedValue(10),
    getAllTemplates: vi.fn().mockResolvedValue(templates),
    getTemplatesForRole: vi.fn().mockImplementation((roleId: number) =>
      Promise.resolve(templates.filter((t) => t.roleId === roleId))
    ),
    createTemplate: vi.fn().mockResolvedValue(10),
    updateTemplate: vi.fn().mockResolvedValue(undefined),
    getTemplateItems: vi.fn().mockImplementation((templateId: number) =>
      Promise.resolve(items.filter((i) => i.templateId === templateId))
    ),
    createTemplateItem: vi.fn().mockResolvedValue(10),
    updateTemplateItem: vi.fn().mockResolvedValue(undefined),
    deleteTemplateItem: vi.fn().mockResolvedValue(undefined),
    getOrCreateInstance: vi.fn().mockResolvedValue(instances[0]),
    getInstanceItems: vi.fn().mockResolvedValue(instanceItemsData),
    toggleInstanceItem: vi.fn().mockResolvedValue(undefined),
    setInstanceItemNote: vi.fn().mockResolvedValue(undefined),
    getAllInstancesForPeriod: vi.fn().mockResolvedValue(instances),
    getAllUsers: vi.fn().mockResolvedValue(users),
    setUserProductionRole: vi.fn().mockResolvedValue(undefined),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn().mockResolvedValue(users[0]),
    getAllTemplateItems: vi.fn().mockResolvedValue(items),
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-1",
    email: "admin@test.com",
    name: "Админ",
    loginMethod: "manus",
    role: "admin",
    productionRole: "production_manager",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createEmployeeContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "user-1",
    email: "ivanov@test.com",
    name: "Иванов",
    loginMethod: "manus",
    role: "user",
    productionRole: "packer",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createDirectorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 3,
    openId: "director-1",
    email: "director@test.com",
    name: "Директор",
    loginMethod: "manus",
    role: "user",
    productionRole: "production_director",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createShiftSupervisorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 4,
    openId: "shift-sup-1",
    email: "shift@test.com",
    name: "Начальник смены",
    loginMethod: "manus",
    role: "user",
    productionRole: "shift_supervisor",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ============ ROLES ============

describe("roles.list", () => {
  it("returns all 10 production roles", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    const roles = await caller.roles.list();
    expect(roles).toHaveLength(10);
    expect(roles[0].slug).toBe("packer");
    expect(roles[5].slug).toBe("production_director");
    expect(roles[6].slug).toBe("shift_assistant");
    expect(roles[7].slug).toBe("packer_foreman");
    expect(roles[8].slug).toBe("senior_mechanic");
    expect(roles[9].slug).toBe("senior_adjuster");
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
    const result = await caller.roles.create({
      slug: "test_role",
      name: "Тестовая роль",
      description: "Тест",
    });
    expect(result).toHaveProperty("id");
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    await expect(
      caller.roles.create({ slug: "test", name: "Test" })
    ).rejects.toThrow();
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
    const result = await caller.templates.addItem({
      templateId: 1,
      sectionTitle: "Тестовая секция",
      text: "Тестовый пункт",
      sortOrder: 10,
    });
    expect(result).toHaveProperty("id");
  });
});

describe("templates.updateItem (admin)", () => {
  it("allows admin to update a template item text", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.templates.updateItem({
      id: 1,
      text: "Обновлённый текст",
    });
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
    const instance = await caller.instances.getOrCreate({
      templateId: 1,
      dateKey: "daily-2026-02-18",
    });
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
    expect(overview.length).toBeGreaterThan(0);
    expect(overview[0]).toHaveProperty("userId");
    expect(overview[0]).toHaveProperty("userName");
    expect(overview[0]).toHaveProperty("total");
    expect(overview[0]).toHaveProperty("completed");
    expect(overview[0]).toHaveProperty("percent");
  });

  it("allows production_director to access dashboard", async () => {
    const caller = appRouter.createCaller(createDirectorContext());
    const overview = await caller.dashboard.overview({ periodType: "daily" });
    expect(overview).toBeInstanceOf(Array);
    expect(overview.length).toBeGreaterThan(0);
  });

  it("rejects regular employee (packer) from dashboard", async () => {
    const caller = appRouter.createCaller(createEmployeeContext());
    await expect(
      caller.dashboard.overview({ periodType: "daily" })
    ).rejects.toThrow();
  });

  it("rejects shift_supervisor from dashboard", async () => {
    const caller = appRouter.createCaller(createShiftSupervisorContext());
    await expect(
      caller.dashboard.overview({ periodType: "daily" })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated users from dashboard", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(
      caller.dashboard.overview({ periodType: "daily" })
    ).rejects.toThrow();
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
    const result = await caller.users.setProductionRole({
      userId: 2,
      productionRole: "adjuster",
    });
    expect(result).toEqual({ success: true });
  });

  it("allows admin to clear a user's production role", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.users.setProductionRole({
      userId: 2,
      productionRole: null,
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects non-admin from setting roles", async () => {
    const caller = appRouter.createCaller(createDirectorContext());
    await expect(
      caller.users.setProductionRole({ userId: 2, productionRole: "mechanic" })
    ).rejects.toThrow();
  });
});
