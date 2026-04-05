import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist mocks ──────────────────────────────────────────────────────
const mockNeon = vi.hoisted(() => vi.fn());
const mockDrizzle = vi.hoisted(() => vi.fn());

vi.mock("@neondatabase/serverless", () => ({
  neon: mockNeon,
}));

vi.mock("drizzle-orm/neon-http", () => ({
  drizzle: mockDrizzle,
}));

vi.mock("./schema", () => ({
  __esModule: true,
  default: {},
}));

describe("db/drizzle", () => {
  beforeEach(() => {
    vi.resetModules();
    mockNeon.mockReset();
    mockDrizzle.mockReset();
  });

  it("lazily initialises db on first property access", async () => {
    const fakeDb = {
      query: { courses: { findMany: vi.fn() } },
      select: vi.fn(),
    };
    const fakeSql = vi.fn();
    mockNeon.mockReturnValue(fakeSql);
    mockDrizzle.mockReturnValue(fakeDb);

    process.env.DATABASE_URL = "postgres://test:test@localhost/test";

    const mod = await import("./drizzle");
    const db = mod.default;

    // Access a property — triggers lazy init
    const q = db.query;

    expect(mockNeon).toHaveBeenCalledWith("postgres://test:test@localhost/test");
    expect(mockDrizzle).toHaveBeenCalledWith(fakeSql, expect.objectContaining({}));
    expect(q).toBe(fakeDb.query);
  });

  it("reuses the same db instance on subsequent accesses", async () => {
    const fakeDb = {
      query: { courses: { findMany: vi.fn() } },
      select: vi.fn(),
    };
    mockNeon.mockReturnValue(vi.fn());
    mockDrizzle.mockReturnValue(fakeDb);

    process.env.DATABASE_URL = "postgres://test:test@localhost/test";

    const mod = await import("./drizzle");
    const db = mod.default;

    // First access
    const firstAccess = db.query;
    // Second access
    const secondAccess = db.select;

    // Proxy returns the correct underlying properties
    expect(firstAccess).toBe(fakeDb.query);
    expect(secondAccess).toBe(fakeDb.select);

    // neon and drizzle should only be called once
    expect(mockNeon).toHaveBeenCalledTimes(1);
    expect(mockDrizzle).toHaveBeenCalledTimes(1);
  });
});
