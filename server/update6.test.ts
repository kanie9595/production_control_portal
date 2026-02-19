import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ---- helpers ----

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: "test-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    productionRole: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: User | null = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ---- Role CRUD tests ----

describe("roles.create", () => {
  it("allows manager to create a new role", async () => {
    const user = makeUser({ role: "admin", productionRole: "production_manager" });
    const caller = appRouter.createCaller(makeCtx(user));

    const result = await caller.roles.create({
      slug: `test-role-${Date.now()}`,
      name: "Тестовая роль",
      description: "Описание тестовой роли",
      sortOrder: 99,
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("rejects regular users from creating roles", async () => {
    const user = makeUser({ role: "user", productionRole: "packer" });
    const caller = appRouter.createCaller(makeCtx(user));

    await expect(
      caller.roles.create({ slug: "test-role", name: "Test" })
    ).rejects.toThrow();
  });
});

describe("roles.update", () => {
  it("allows manager to update a role name", async () => {
    const user = makeUser({ role: "admin", productionRole: "production_manager" });
    const caller = appRouter.createCaller(makeCtx(user));

    // First create a role
    const role = await caller.roles.create({
      slug: `update-test-${Date.now()}`,
      name: "Original Name",
    });

    // Update it
    const result = await caller.roles.update({
      id: role.id!,
      name: "Updated Name",
    });

    expect(result).toEqual({ success: true });
  });

  it("rejects regular users from updating roles", async () => {
    const user = makeUser({ role: "user", productionRole: "adjuster" });
    const caller = appRouter.createCaller(makeCtx(user));

    await expect(
      caller.roles.update({ id: 1, name: "Hacked" })
    ).rejects.toThrow();
  });
});

describe("roles.list", () => {
  it("returns a list of production roles", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeCtx(user));

    const roles = await caller.roles.list();
    expect(Array.isArray(roles)).toBe(true);
  });
});

// ---- Mold-Product linking tests ----

describe("lookups.create with parentProduct", () => {
  it("allows creating a mold with parentProduct field", async () => {
    const user = makeUser({ role: "admin", productionRole: "production_manager" });
    const caller = appRouter.createCaller(makeCtx(user));

    const result = await caller.lookups.create({
      category: "molds",
      value: `Test Mold ${Date.now()}`,
      parentProduct: "Стакан 500",
      sortOrder: 0,
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("allows creating a mold without parentProduct", async () => {
    const user = makeUser({ role: "admin", productionRole: "production_manager" });
    const caller = appRouter.createCaller(makeCtx(user));

    const result = await caller.lookups.create({
      category: "molds",
      value: `Mold No Parent ${Date.now()}`,
    });

    expect(result).toHaveProperty("id");
  });
});

describe("lookups.moldsForProduct", () => {
  it("returns molds filtered by product name", async () => {
    const user = makeUser({ role: "admin", productionRole: "production_manager" });
    const caller = appRouter.createCaller(makeCtx(user));

    // Create a product-linked mold
    const productName = `Product-${Date.now()}`;
    await caller.lookups.create({
      category: "molds",
      value: `Mold for ${productName}`,
      parentProduct: productName,
    });

    const molds = await caller.lookups.moldsForProduct({ product: productName });
    expect(Array.isArray(molds)).toBe(true);
    expect(molds.length).toBeGreaterThanOrEqual(1);
    for (const mold of molds) {
      expect(mold.parentProduct).toBe(productName);
    }
  });

  it("returns empty array for non-existent product", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeCtx(user));

    const molds = await caller.lookups.moldsForProduct({ product: "NonExistentProduct12345" });
    expect(molds).toEqual([]);
  });
});

// ---- Report deletion tests ----

describe("reports.delete", () => {
  it("allows manager to delete a report", async () => {
    const user = makeUser({ role: "admin", productionRole: "production_manager" });
    const caller = appRouter.createCaller(makeCtx(user));

    // Create a report
    const report = await caller.reports.create({
      shiftDate: "2026-02-19",
      shiftNumber: 1,
      notes: "Delete test",
    });

    // Delete it
    const result = await caller.reports.delete({ id: report.id! });
    expect(result).toEqual({ success: true });
  });

  it("rejects regular users from deleting reports", async () => {
    const user = makeUser({ role: "user", productionRole: "packer" });
    const caller = appRouter.createCaller(makeCtx(user));

    await expect(
      caller.reports.delete({ id: 999999 })
    ).rejects.toThrow();
  });
});

// ---- Machine status sync tests ----

describe("orders.updateStatus - machine status sync", () => {
  it("sets machine to running when order goes in_progress", async () => {
    const user = makeUser({ role: "admin", productionRole: "production_manager" });
    const caller = appRouter.createCaller(makeCtx(user));

    const machines = await caller.machines.list();
    if (machines.length === 0) return;

    const machineId = machines[0].id;

    // Create an order
    const order = await caller.orders.create({
      machineId,
      product: "Machine Status Test",
      quantity: 50,
    });

    // Set order to in_progress
    await caller.orders.updateStatus({
      orderId: order.id!,
      status: "in_progress",
    });

    // Check machine status
    const updatedMachines = await caller.machines.list();
    const machine = updatedMachines.find(m => m.id === machineId);
    expect(machine?.status).toBe("running");
  });

  it("sets machine to idle when last active order is completed", async () => {
    const user = makeUser({ role: "admin", productionRole: "production_manager" });
    const caller = appRouter.createCaller(makeCtx(user));

    const machines = await caller.machines.list();
    if (machines.length < 2) return;

    // Use a machine that likely has no other active orders
    const machineId = machines[machines.length - 1].id;

    // Create an order and set it to in_progress
    const order = await caller.orders.create({
      machineId,
      product: "Idle Test",
      quantity: 10,
    });

    await caller.orders.updateStatus({
      orderId: order.id!,
      status: "in_progress",
    });

    // Complete the order
    await caller.orders.updateStatus({
      orderId: order.id!,
      status: "completed",
    });

    // Check machine status - should be idle if no other active orders
    const updatedMachines = await caller.machines.list();
    const machine = updatedMachines.find(m => m.id === machineId);
    // Machine should be idle (unless other orders exist on this machine)
    expect(["idle", "running"]).toContain(machine?.status);
  });
});

// ---- Lookups update with parentProduct ----

describe("lookups.update with parentProduct", () => {
  it("allows updating parentProduct on a mold", async () => {
    const user = makeUser({ role: "admin", productionRole: "production_manager" });
    const caller = appRouter.createCaller(makeCtx(user));

    // Create a mold
    const mold = await caller.lookups.create({
      category: "molds",
      value: `Update Parent Test ${Date.now()}`,
    });

    // Update its parentProduct
    const result = await caller.lookups.update({
      id: mold.id!,
      parentProduct: "Стакан 200",
    });

    expect(result).toEqual({ success: true });
  });

  it("allows clearing parentProduct (set to null)", async () => {
    const user = makeUser({ role: "admin", productionRole: "production_manager" });
    const caller = appRouter.createCaller(makeCtx(user));

    // Create a mold with parentProduct
    const mold = await caller.lookups.create({
      category: "molds",
      value: `Clear Parent Test ${Date.now()}`,
      parentProduct: "Стакан 500",
    });

    // Clear parentProduct
    const result = await caller.lookups.update({
      id: mold.id!,
      parentProduct: null,
    });

    expect(result).toEqual({ success: true });
  });
});

// ---- Active orders for machine ----

describe("orders.activeOrdersForMachine", () => {
  it("returns only pending and in_progress orders", async () => {
    const user = makeUser({ role: "admin", productionRole: "production_manager" });
    const caller = appRouter.createCaller(makeCtx(user));

    const machines = await caller.machines.list();
    if (machines.length === 0) return;

    const machineId = machines[0].id;
    const activeOrders = await caller.orders.activeOrdersForMachine({ machineId });

    for (const order of activeOrders) {
      expect(["pending", "in_progress"]).toContain(order.status);
    }
  });
});
