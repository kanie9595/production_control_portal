import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createManagerContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "manager-user",
    email: "manager@example.com",
    name: "Manager User",
    loginMethod: "manus",
    role: "admin",
    productionRole: "production_manager",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createWorkerContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "worker-user",
    email: "worker@example.com",
    name: "Worker User",
    loginMethod: "manus",
    role: "user",
    productionRole: "adjuster",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("orders.create", () => {
  it("creates an order without rawMaterial field", async () => {
    const ctx = createManagerContext();
    const caller = appRouter.createCaller(ctx);

    // First ensure machines exist
    const machines = await caller.machines.list();
    if (machines.length === 0) {
      // Skip if no machines seeded
      return;
    }

    const machineId = machines[0].id;
    const result = await caller.orders.create({
      machineId,
      product: "Test Product",
      color: "Белый",
      quantity: 100,
      moldName: "Test Mold",
      notes: "Test order",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });
});

describe("orders.activeOrdersForMachine", () => {
  it("returns only active/pending orders for a machine", async () => {
    const ctx = createManagerContext();
    const caller = appRouter.createCaller(ctx);

    const machines = await caller.machines.list();
    if (machines.length === 0) return;

    const machineId = machines[0].id;
    const activeOrders = await caller.orders.activeOrdersForMachine({ machineId });

    // All returned orders should be pending or in_progress
    for (const order of activeOrders) {
      expect(["pending", "in_progress"]).toContain(order.status);
    }
  });
});

describe("reports.addRow with orderId", () => {
  it("accepts orderId parameter when adding a report row", async () => {
    const ctx = createManagerContext();
    const caller = appRouter.createCaller(ctx);

    // Create a report
    const report = await caller.reports.create({
      shiftDate: "2026-02-19",
      shiftNumber: 1,
      notes: "Test report",
    });

    expect(report).toHaveProperty("id");

    // Add a row without orderId (should work)
    const row = await caller.reports.addRow({
      reportId: report.id!,
      machineNumber: "ТПА-01",
      moldProduct: "Test Product",
      productColor: "Белый",
      planQty: 100,
      actualQty: 50,
      standardCycle: "30",
      actualCycle: "32",
      downtimeMin: 0,
      defectKg: "0",
      changeover: 0,
    });

    expect(row).toHaveProperty("id");
  });

  it("links report row to order and increments completedQty", async () => {
    const ctx = createManagerContext();
    const caller = appRouter.createCaller(ctx);

    const machines = await caller.machines.list();
    if (machines.length === 0) return;

    const machineId = machines[0].id;

    // Create an order
    const order = await caller.orders.create({
      machineId,
      product: "Linked Product",
      color: "Красный",
      quantity: 200,
    });

    // Check initial state
    let allOrders = await caller.orders.forMachine({ machineId });
    let createdOrder = allOrders.find((o: any) => o.id === order.id);
    const initialCompleted = createdOrder?.completedQty ?? 0;

    // Create a report and add a row linked to the order
    const report = await caller.reports.create({
      shiftDate: "2026-02-19",
      shiftNumber: 2,
    });

    await caller.reports.addRow({
      reportId: report.id!,
      orderId: order.id!,
      machineNumber: machines[0].number,
      moldProduct: "Linked Product",
      productColor: "Красный",
      planQty: 50,
      actualQty: 30,
      standardCycle: "25",
      actualCycle: "27",
      downtimeMin: 0,
      defectKg: "0",
      changeover: 0,
    });

    // Verify completedQty increased
    allOrders = await caller.orders.forMachine({ machineId });
    createdOrder = allOrders.find((o: any) => o.id === order.id);
    expect(createdOrder?.completedQty).toBe(initialCompleted + 30);
  });
});

describe("reports.deleteRow reverses deduction", () => {
  it("decrements order completedQty when linked row is deleted", async () => {
    const ctx = createManagerContext();
    const caller = appRouter.createCaller(ctx);

    const machines = await caller.machines.list();
    if (machines.length === 0) return;

    const machineId = machines[0].id;

    // Create order
    const order = await caller.orders.create({
      machineId,
      product: "Delete Test Product",
      color: "Зелёный",
      quantity: 100,
    });

    // Create report and linked row
    const report = await caller.reports.create({
      shiftDate: "2026-02-19",
      shiftNumber: 1,
    });

    const row = await caller.reports.addRow({
      reportId: report.id!,
      orderId: order.id!,
      machineNumber: machines[0].number,
      moldProduct: "Delete Test Product",
      productColor: "Зелёный",
      planQty: 50,
      actualQty: 20,
      standardCycle: "30",
      actualCycle: "30",
      downtimeMin: 0,
      defectKg: "0",
      changeover: 0,
    });

    // Verify completedQty after add
    let allOrders = await caller.orders.forMachine({ machineId });
    let createdOrder = allOrders.find((o: any) => o.id === order.id);
    const afterAdd = createdOrder?.completedQty ?? 0;
    expect(afterAdd).toBeGreaterThanOrEqual(20);

    // Delete the row
    await caller.reports.deleteRow({ id: row.id! });

    // Verify completedQty decreased
    allOrders = await caller.orders.forMachine({ machineId });
    createdOrder = allOrders.find((o: any) => o.id === order.id);
    expect(createdOrder?.completedQty).toBe(afterAdd - 20);
  });
});

describe("orders.list shows remaining quantity", () => {
  it("returns orders with completedQty field", async () => {
    const ctx = createManagerContext();
    const caller = appRouter.createCaller(ctx);

    const allOrders = await caller.orders.list();
    if (allOrders.length === 0) return;

    // Every order should have quantity and completedQty
    for (const order of allOrders) {
      expect(order).toHaveProperty("quantity");
      expect(order).toHaveProperty("completedQty");
      expect(typeof order.quantity).toBe("number");
      expect(typeof order.completedQty).toBe("number");
    }
  });
});
