import { describe, expect, it, vi, beforeEach } from "vitest";
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

// ---- tests ----

describe("permissions procedures", () => {
  describe("permissions.forCurrentUser", () => {
    it("returns empty array for user with no productionRole", async () => {
      const user = makeUser({ productionRole: null });
      const caller = appRouter.createCaller(makeCtx(user));
      const result = await caller.permissions.forCurrentUser();
      expect(result).toEqual([]);
    });
  });

  describe("permissions.all - access control", () => {
    it("rejects regular users without manager role", async () => {
      const user = makeUser({ role: "user", productionRole: "packer" });
      const caller = appRouter.createCaller(makeCtx(user));
      await expect(caller.permissions.all()).rejects.toThrow();
    });

    it("rejects unauthenticated users", async () => {
      const caller = appRouter.createCaller(makeCtx(null));
      await expect(caller.permissions.all()).rejects.toThrow();
    });
  });

  describe("permissions.update - access control", () => {
    it("rejects regular users", async () => {
      const user = makeUser({ role: "user", productionRole: "mechanic" });
      const caller = appRouter.createCaller(makeCtx(user));
      await expect(
        caller.permissions.update({ roleSlug: "packer", module: "reports", hasAccess: true })
      ).rejects.toThrow();
    });
  });

  describe("permissions.bulkUpdate - access control", () => {
    it("rejects regular users", async () => {
      const user = makeUser({ role: "user", productionRole: "adjuster" });
      const caller = appRouter.createCaller(makeCtx(user));
      await expect(
        caller.permissions.bulkUpdate({
          permissions: [{ roleSlug: "packer", module: "reports", hasAccess: true }],
        })
      ).rejects.toThrow();
    });
  });
});

describe("lookups procedures - access control", () => {
  it("rejects unauthenticated users from lookups.all", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.lookups.all()).rejects.toThrow();
  });

  it("rejects non-admin users from lookups.create", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeCtx(user));
    await expect(
      caller.lookups.create({ category: "machines", value: "ТПА-01" })
    ).rejects.toThrow();
  });

  it("rejects non-admin users from lookups.delete", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeCtx(user));
    await expect(caller.lookups.delete({ id: 1 })).rejects.toThrow();
  });
});

describe("lookupsBulk procedures - access control", () => {
  it("rejects non-admin users from lookupsBulk.createBulk", async () => {
    const user = makeUser({ role: "user" });
    const caller = appRouter.createCaller(makeCtx(user));
    await expect(
      caller.lookupsBulk.createBulk({
        items: [{ category: "machines", value: "ТПА-01", sortOrder: 0 }],
      })
    ).rejects.toThrow();
  });
});
