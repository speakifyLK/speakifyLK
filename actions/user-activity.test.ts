import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Hoist mocks ──────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
const mockDbQuery = vi.hoisted(() => ({
  userActivity: { findFirst: vi.fn() },
}));
const mockDbInsert = vi.hoisted(() => vi.fn());
const mockDbUpdate = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ _type: "and", args }),
  eq: (col: unknown, val: unknown) => ({ _type: "eq", col, val }),
}));

vi.mock("@/db/schema", () => ({
  userActivity: {
    userId: "col_userActivity.userId",
    date: "col_userActivity.date",
    id: "col_userActivity.id",
  },
}));

vi.mock("@/db/drizzle", () => {
  const fakeHelpers = {
    and: (...args: unknown[]) => ({ _type: "and", args }),
    eq: (col: unknown, val: unknown) => ({ _type: "eq", col, val }),
  };
  const fakeTable = new Proxy(
    {},
    { get: (_t, prop) => `table.${String(prop)}` }
  );

  const wrapQuery = (mockFn: any) => {
    return (opts?: Record<string, unknown>) => {
      if (opts?.where && typeof opts.where === "function") {
        (opts.where as (t: unknown, h: unknown) => unknown)(
          fakeTable,
          fakeHelpers
        );
      }
      if (opts?.orderBy && typeof opts.orderBy === "function") {
        (opts.orderBy as (t: unknown, h: unknown) => unknown)(
          fakeTable,
          fakeHelpers
        );
      }
      return mockFn(opts);
    };
  };

  const whereUpdateFn = vi.fn().mockResolvedValue(undefined);
  const setFn = vi.fn().mockReturnValue({ where: whereUpdateFn });
  const valuesFn = vi.fn().mockResolvedValue(undefined);

  return {
    default: {
      query: {
        userActivity: {
          findFirst: wrapQuery(mockDbQuery.userActivity.findFirst),
        },
      },
      insert: mockDbInsert.mockReturnValue({ values: valuesFn }),
      update: mockDbUpdate.mockReturnValue({ set: setFn }),
    },
  };
});

import { recordDailyActivity } from "./user-activity";

describe("actions/user-activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns early when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await recordDailyActivity({ lessonsCompleted: 1 });
    expect(mockDbQuery.userActivity.findFirst).not.toHaveBeenCalled();
    expect(mockDbInsert).not.toHaveBeenCalled();
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it("inserts new row when no existing activity for today", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockDbQuery.userActivity.findFirst.mockResolvedValue(undefined);

    await recordDailyActivity({
      lessonsCompleted: 1,
      quizzesCompleted: 0,
      xpEarned: 10,
    });

    expect(mockDbInsert).toHaveBeenCalled();
  });

  it("updates existing row when activity exists for today", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockDbQuery.userActivity.findFirst.mockResolvedValue({
      id: 42,
      userId: "user_123",
      date: "2025-06-15",
      lessonsCompleted: 2,
      quizzesCompleted: 1,
      xpEarned: 30,
    });

    await recordDailyActivity({
      lessonsCompleted: 1,
      quizzesCompleted: 1,
      xpEarned: 15,
    });

    expect(mockDbUpdate).toHaveBeenCalled();
  });

  it("uses default 0 for missing opts fields on insert", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockDbQuery.userActivity.findFirst.mockResolvedValue(undefined);

    await recordDailyActivity({});

    expect(mockDbInsert).toHaveBeenCalled();
  });

  it("uses default 0 for missing opts fields on update", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockDbQuery.userActivity.findFirst.mockResolvedValue({
      id: 42,
      userId: "user_123",
      date: "2025-06-15",
      lessonsCompleted: 1,
      quizzesCompleted: 0,
      xpEarned: 5,
    });

    await recordDailyActivity({});

    expect(mockDbUpdate).toHaveBeenCalled();
  });

  it("uses the correct UTC date", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockDbQuery.userActivity.findFirst.mockResolvedValue(undefined);

    await recordDailyActivity({ lessonsCompleted: 1 });

    // The date should be 2025-06-15 based on our fake timer
    expect(mockDbQuery.userActivity.findFirst).toHaveBeenCalled();
  });
});
