import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist mocks ──────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
const mockCurrentUser = vi.hoisted(() => vi.fn());
const mockGetUserProgress = vi.hoisted(() => vi.fn());
const mockGetUserSubscription = vi.hoisted(() => vi.fn());
const mockGetCourseById = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockRedirect = vi.hoisted(() => vi.fn());

const mockDbInsert = vi.hoisted(() => vi.fn());
const mockDbUpdate = vi.hoisted(() => vi.fn());
const mockDbQuery = vi.hoisted(() => ({
  challenges: { findFirst: vi.fn() },
  challengeProgress: { findFirst: vi.fn() },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/db/queries", () => ({
  getCourseById: mockGetCourseById,
  getUserProgress: mockGetUserProgress,
  getUserSubscription: mockGetUserSubscription,
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ _type: "and", args }),
  eq: (col: unknown, val: unknown) => ({ _type: "eq", col, val }),
}));

vi.mock("@/constants", () => ({
  MAX_HEARTS: 5,
  POINTS_TO_REFILL: 10,
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

import { upsertUserProgress, reduceHearts, refillHearts } from "./user-progress";
import db from "@/db/drizzle";

const dbMocks = (db as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> })._mocks;

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: "user-1" });
  mockCurrentUser.mockResolvedValue({
    firstName: "John",
    imageUrl: "https://example.com/photo.jpg",
  });
  mockGetUserProgress.mockResolvedValue({
    userId: "user-1",
    hearts: 5,
    points: 100,
    activeCourseId: 1,
  });
  mockGetUserSubscription.mockResolvedValue(null);
  dbMocks.setFn.mockReturnValue({ where: dbMocks.whereFn });
  dbMocks.whereFn.mockReturnValue({ returning: dbMocks.returningFn });
});

// =====================================================================
// upsertUserProgress
// =====================================================================
describe("upsertUserProgress", () => {
  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(upsertUserProgress(1)).rejects.toThrow("Unauthorized.");
  });

  it("throws when currentUser returns null", async () => {
    mockCurrentUser.mockResolvedValue(null);
    await expect(upsertUserProgress(1)).rejects.toThrow("Unauthorized.");
  });

  it("throws when course not found", async () => {
    mockGetCourseById.mockResolvedValue(null);
    await expect(upsertUserProgress(1)).rejects.toThrow("Course not found.");
  });

  it("throws when course has no units", async () => {
    mockGetCourseById.mockResolvedValue({ id: 1, units: [] });
    await expect(upsertUserProgress(1)).rejects.toThrow("Course is empty.");
  });

  it("throws when course has units but no lessons", async () => {
    mockGetCourseById.mockResolvedValue({ id: 1, units: [{ lessons: [] }] });
    await expect(upsertUserProgress(1)).rejects.toThrow("Course is empty.");
  });

  it("updates existing user progress and redirects", async () => {
    mockGetCourseById.mockResolvedValue({
      id: 1,
      units: [{ lessons: [{ id: 1 }] }],
    });
    mockGetUserProgress.mockResolvedValue({
      userId: "user-1",
      activeCourseId: 2,
    });

    await upsertUserProgress(1);

    expect(mockDbUpdate).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/courses");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/learn");
    expect(mockRedirect).toHaveBeenCalledWith("/learn");
  });

  it("uses fallback values when user has no firstName or imageUrl", async () => {
    mockCurrentUser.mockResolvedValue({ firstName: null, imageUrl: null });
    mockGetCourseById.mockResolvedValue({
      id: 1,
      units: [{ lessons: [{ id: 1 }] }],
    });
    mockGetUserProgress.mockResolvedValue(null);

    await upsertUserProgress(1);

    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/learn");
  });

  it("uses fallback values in update path when user has no firstName or imageUrl", async () => {
    mockCurrentUser.mockResolvedValue({ firstName: null, imageUrl: null });
    mockGetCourseById.mockResolvedValue({
      id: 1,
      units: [{ lessons: [{ id: 1 }] }],
    });
    mockGetUserProgress.mockResolvedValue({
      userId: "user-1",
      activeCourseId: 2,
    });

    await upsertUserProgress(1);

    expect(mockDbUpdate).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/learn");
  });

  it("inserts new user progress when none exists", async () => {
    mockGetCourseById.mockResolvedValue({
      id: 1,
      units: [{ lessons: [{ id: 1 }] }],
    });
    mockGetUserProgress.mockResolvedValue(null);

    await upsertUserProgress(1);

    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/courses");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/learn");
    expect(mockRedirect).toHaveBeenCalledWith("/learn");
  });
});

// =====================================================================
// reduceHearts
// =====================================================================
describe("reduceHearts", () => {
  beforeEach(() => {
    mockDbQuery.challenges.findFirst.mockResolvedValue({ id: 1, lessonId: 10 });
    mockDbQuery.challengeProgress.findFirst.mockResolvedValue(null);
  });

  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(reduceHearts(1)).rejects.toThrow("Unauthorized.");
  });

  it("throws when challenge not found", async () => {
    mockDbQuery.challenges.findFirst.mockResolvedValue(null);
    await expect(reduceHearts(1)).rejects.toThrow("Challenge not found.");
  });

  it("returns error: practice when challenge already has progress", async () => {
    mockDbQuery.challengeProgress.findFirst.mockResolvedValue({ id: 5 });
    const result = await reduceHearts(1);
    expect(result).toEqual({ error: "practice" });
  });

  it("throws when user progress not found", async () => {
    mockGetUserProgress.mockResolvedValue(null);
    await expect(reduceHearts(1)).rejects.toThrow("User progress not found.");
  });

  it("returns error: subscription when user has active subscription", async () => {
    mockGetUserSubscription.mockResolvedValue({ isActive: true });
    const result = await reduceHearts(1);
    expect(result).toEqual({ error: "subscription" });
  });

  it("returns error: hearts when hearts is 0", async () => {
    mockGetUserProgress.mockResolvedValue({ hearts: 0, points: 100 });
    const result = await reduceHearts(1);
    expect(result).toEqual({ error: "hearts" });
  });

  it("reduces hearts by 1", async () => {
    mockGetUserProgress.mockResolvedValue({ hearts: 3, points: 100 });

    await reduceHearts(1);

    expect(mockDbUpdate).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/shop");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/learn");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/quests");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/leaderboard");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/lesson/10");
  });
});

// =====================================================================
// refillHearts
// =====================================================================
describe("refillHearts", () => {
  it("throws when user progress not found", async () => {
    mockGetUserProgress.mockResolvedValue(null);
    await expect(refillHearts()).rejects.toThrow("User progress not found.");
  });

  it("throws when hearts are already full", async () => {
    mockGetUserProgress.mockResolvedValue({
      userId: "user-1",
      hearts: 5,
      points: 100,
    });
    await expect(refillHearts()).rejects.toThrow("Hearts are already full.");
  });

  it("throws when not enough points", async () => {
    mockGetUserProgress.mockResolvedValue({
      userId: "user-1",
      hearts: 3,
      points: 5,
    });
    await expect(refillHearts()).rejects.toThrow("Not enough points.");
  });

  it("refills hearts and deducts points", async () => {
    mockGetUserProgress.mockResolvedValue({
      userId: "user-1",
      hearts: 2,
      points: 50,
    });

    await refillHearts();

    expect(mockDbUpdate).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/shop");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/learn");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/quests");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/leaderboard");
  });
});
