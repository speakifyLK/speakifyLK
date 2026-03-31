import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist mocks ──────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
const mockGetUserProgress = vi.hoisted(() => vi.fn());
const mockGetUserSubscription = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

const mockDbInsert = vi.hoisted(() => vi.fn());
const mockDbUpdate = vi.hoisted(() => vi.fn());
const mockDbQuery = vi.hoisted(() => ({
  challenges: { findFirst: vi.fn() },
  challengeProgress: { findFirst: vi.fn() },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/db/queries", () => ({
  getUserProgress: mockGetUserProgress,
  getUserSubscription: mockGetUserSubscription,
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ _type: "and", args }),
  eq: (col: unknown, val: unknown) => ({ _type: "eq", col, val }),
}));

vi.mock("@/constants", () => ({
  MAX_HEARTS: 5,
}));

vi.mock("@/db/drizzle", () => {
  const returningFn = vi.fn();
  const whereFn = vi.fn();
  const valuesFn = vi.fn();
  const setFn = vi.fn();

  valuesFn.mockReturnValue({ returning: returningFn });
  setFn.mockReturnValue({ where: whereFn });
  whereFn.mockReturnValue({ returning: returningFn });

  const db = {
    insert: mockDbInsert.mockReturnValue({ values: valuesFn }),
    update: mockDbUpdate.mockReturnValue({ set: setFn }),
    query: mockDbQuery,
    _mocks: { returningFn, whereFn, valuesFn, setFn },
  };
  return { default: db };
});

vi.mock("@/db/schema", () => ({
  challengeProgress: {
    id: "cp.id",
    userId: "cp.userId",
    challengeId: "cp.challengeId",
  },
  challenges: { id: "challenges.id" },
  userProgress: { userId: "up.userId" },
}));

import { upsertChallengeProgress } from "./challenge-progress";
import db from "@/db/drizzle";

const dbMocks = (db as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> })._mocks;

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: "user-1" });
  mockGetUserProgress.mockResolvedValue({ hearts: 5, points: 100 });
  mockGetUserSubscription.mockResolvedValue(null);
  mockDbQuery.challenges.findFirst.mockResolvedValue({ id: 1, lessonId: 10 });
  mockDbQuery.challengeProgress.findFirst.mockResolvedValue(null);
  // Setup default chaining
  dbMocks.setFn.mockReturnValue({ where: dbMocks.whereFn });
  dbMocks.whereFn.mockReturnValue({ returning: dbMocks.returningFn });
});

describe("upsertChallengeProgress", () => {
  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(upsertChallengeProgress(1)).rejects.toThrow("Unauthorized.");
  });

  it("throws when user progress not found", async () => {
    mockGetUserProgress.mockResolvedValue(null);
    await expect(upsertChallengeProgress(1)).rejects.toThrow("User progress not found.");
  });

  it("throws when challenge not found", async () => {
    mockDbQuery.challenges.findFirst.mockResolvedValue(null);
    await expect(upsertChallengeProgress(1)).rejects.toThrow("Challenge not found.");
  });

  it("returns error: hearts when hearts is 0 and not practice and no subscription", async () => {
    mockGetUserProgress.mockResolvedValue({ hearts: 0, points: 100 });
    mockGetUserSubscription.mockResolvedValue(null);
    mockDbQuery.challengeProgress.findFirst.mockResolvedValue(null); // not practice

    const result = await upsertChallengeProgress(1);
    expect(result).toEqual({ error: "hearts" });
  });

  it("allows progress when hearts is 0 but has active subscription", async () => {
    mockGetUserProgress.mockResolvedValue({ hearts: 0, points: 100 });
    mockGetUserSubscription.mockResolvedValue({ isActive: true });
    mockDbQuery.challengeProgress.findFirst.mockResolvedValue(null);

    await upsertChallengeProgress(1);
    expect(mockDbInsert).toHaveBeenCalled();
  });

  it("allows progress when hearts is 0 but is practice", async () => {
    mockGetUserProgress.mockResolvedValue({ hearts: 0, points: 100 });
    mockDbQuery.challengeProgress.findFirst.mockResolvedValue({ id: 5 }); // practice

    await upsertChallengeProgress(1);
    expect(mockDbUpdate).toHaveBeenCalled();
  });

  it("updates existing challenge progress and awards hearts+points for practice", async () => {
    mockDbQuery.challengeProgress.findFirst.mockResolvedValue({ id: 5 });
    mockGetUserProgress.mockResolvedValue({ hearts: 3, points: 100 });

    await upsertChallengeProgress(1);

    // Should call update twice: once for challengeProgress, once for userProgress
    expect(mockDbUpdate).toHaveBeenCalledTimes(2);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/learn");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/lesson");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/quests");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/leaderboard");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/lesson/10");
  });

  it("caps hearts at MAX_HEARTS during practice", async () => {
    mockDbQuery.challengeProgress.findFirst.mockResolvedValue({ id: 5 });
    mockGetUserProgress.mockResolvedValue({ hearts: 5, points: 100 });

    await upsertChallengeProgress(1);
    expect(mockDbUpdate).toHaveBeenCalled();
  });

  it("inserts new challenge progress and awards points for non-practice", async () => {
    mockDbQuery.challengeProgress.findFirst.mockResolvedValue(null);

    await upsertChallengeProgress(1);

    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockDbUpdate).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/learn");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/lesson/10");
  });
});
