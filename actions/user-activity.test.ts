import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Hoist mocks ──────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
const mockOnConflictDoUpdate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockValues = vi.hoisted(() =>
  vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate })
);
const mockDbInsert = vi.hoisted(() => vi.fn().mockReturnValue({ values: mockValues }));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

vi.mock("drizzle-orm", () => ({
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    _type: "sql",
    strings: [...strings],
    values,
  }),
}));

vi.mock("@/db/schema", () => ({
  userActivity: {
    userId: "col_userActivity.userId",
    date: "col_userActivity.date",
    id: "col_userActivity.id",
    lessonsCompleted: "col_userActivity.lessonsCompleted",
    quizzesCompleted: "col_userActivity.quizzesCompleted",
    xpEarned: "col_userActivity.xpEarned",
  },
}));

vi.mock("@/db/drizzle", () => {
  return {
    default: {
      insert: mockDbInsert,
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
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it("performs an upsert when authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    await recordDailyActivity({
      lessonsCompleted: 1,
      quizzesCompleted: 0,
      xpEarned: 10,
    });

    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_123",
        date: "2025-06-15",
        lessonsCompleted: 1,
        quizzesCompleted: 0,
        xpEarned: 10,
      })
    );
    expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.arrayContaining(["col_userActivity.userId", "col_userActivity.date"]),
        set: expect.objectContaining({
          lessonsCompleted: expect.anything(),
          quizzesCompleted: expect.anything(),
          xpEarned: expect.anything(),
          updatedAt: expect.anything(),
        }),
      })
    );
  });

  it("uses default 0 for missing opts fields", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    await recordDailyActivity({});

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_123",
        date: "2025-06-15",
        lessonsCompleted: 0,
        quizzesCompleted: 0,
        xpEarned: 0,
      })
    );
  });

  it("uses the correct UTC date", async () => {
    // Set time to just before midnight UTC on June 15 → still June 15
    vi.setSystemTime(new Date("2025-06-15T23:59:59Z"));
    mockAuth.mockResolvedValue({ userId: "user_123" });

    await recordDailyActivity({ lessonsCompleted: 1 });

    expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({ date: "2025-06-15" }));
  });
});
