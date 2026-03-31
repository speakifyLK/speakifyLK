import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist mocks ──────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
const mockGetUserProgress = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

const mockDbInsert = vi.hoisted(() => vi.fn());
const mockDbUpdate = vi.hoisted(() => vi.fn());
const mockDbQuery = vi.hoisted(() => ({
  aiQuizQuestions: { findFirst: vi.fn() },
  aiQuizSessions: { findFirst: vi.fn() },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/db/queries", () => ({
  getUserProgress: mockGetUserProgress,
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ _type: "and", args }),
  eq: (col: unknown, val: unknown) => ({ _type: "eq", col, val }),
  isNull: (col: unknown) => ({ _type: "isNull", col }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    _type: "sql",
    strings,
    values,
  }),
}));

vi.mock("@/db/drizzle", () => {
  // Create chainable mock helpers
  const returningFn = vi.fn();
  const whereFn = vi.fn();
  const valuesFn = vi.fn();
  const setFn = vi.fn();
  const onConflictDoUpdateFn = vi.fn();

  // Wire up chaining
  valuesFn.mockReturnValue({
    returning: returningFn,
    onConflictDoUpdate: onConflictDoUpdateFn,
  });
  setFn.mockReturnValue({ where: whereFn });
  whereFn.mockReturnValue({ returning: returningFn });

  const db = {
    insert: mockDbInsert.mockReturnValue({ values: valuesFn }),
    update: mockDbUpdate.mockReturnValue({ set: setFn }),
    query: mockDbQuery,
    _mocks: { returningFn, whereFn, valuesFn, setFn, onConflictDoUpdateFn },
  };
  return { default: db };
});

vi.mock("@/db/schema", () => ({
  aiQuizQuestions: { id: "aiQuizQuestions.id" },
  aiQuizSessions: {
    id: "aiQuizSessions.id",
    userId: "aiQuizSessions.userId",
    completedAt: "aiQuizSessions.completedAt",
    $inferSelect: {},
  },
  userProgress: {
    userId: "userProgress.userId",
    points: "userProgress.points",
  },
}));

// ── Import the module under test ─────────────────────────────────────
import {
  createQuizSession,
  submitQuizAnswer,
  completeQuizSession,
} from "./quiz";

// Also need to access the private helpers. Since they are not exported, we
// will import the module and test them through the public API. But for pure
// helper tests we can re-import the raw module.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import db from "@/db/drizzle";

const dbMocks = (
  db as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> }
)._mocks;

// ── Setup ────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: "user-1" });
  mockGetUserProgress.mockResolvedValue({
    activeCourseId: 1,
    hearts: 5,
    points: 100,
  });
});

// =====================================================================
// Private helper function tests (tested via submitQuizAnswer)
// =====================================================================

describe("quiz action helpers (via submitQuizAnswer)", () => {
  // We test the pure helper functions indirectly through submitQuizAnswer
  // since they are module-private.

  function setupQuestion(overrides: Record<string, unknown> = {}) {
    const base = {
      id: 10,
      sessionId: 1,
      type: "mcq" as const,
      question: "What?",
      options: null,
      correctAnswer: "hello",
      userAnswer: null,
      isCorrect: null,
      explanation: "test",
      order: 1,
      session: {
        id: 1,
        userId: "user-1",
        completedAt: null,
        correctAnswers: 0,
        totalQuestions: 5,
        difficulty: "beginner",
        courseId: 1,
      },
      ...overrides,
    };
    mockDbQuery.aiQuizQuestions.findFirst.mockResolvedValue(base);
    dbMocks.setFn.mockReturnValue({ where: dbMocks.whereFn });
    dbMocks.whereFn.mockReturnValue({ returning: dbMocks.returningFn });
    return base;
  }

  describe("MCQ - exact match", () => {
    it("returns isCorrect: true for exact match", async () => {
      setupQuestion({ correctAnswer: "apple", type: "mcq" });
      const result = await submitQuizAnswer(10, "apple");
      expect(result).toEqual({ isCorrect: true });
    });

    it("returns isCorrect: true for case-insensitive match", async () => {
      setupQuestion({ correctAnswer: "Apple", type: "mcq" });
      const result = await submitQuizAnswer(10, "apple");
      expect(result).toEqual({ isCorrect: true });
    });

    it("returns isCorrect: false for wrong MCQ answer", async () => {
      setupQuestion({ correctAnswer: "apple", type: "mcq" });
      const result = await submitQuizAnswer(10, "banana");
      expect(result).toEqual({ isCorrect: false });
    });
  });

  describe("fill_blank - fuzzy matching", () => {
    it("returns true for exact match after normalization", async () => {
      setupQuestion({ correctAnswer: "  Hello World  ", type: "fill_blank" });
      const result = await submitQuizAnswer(10, "hello world");
      expect(result).toEqual({ isCorrect: true });
    });

    it("returns true for close Levenshtein match", async () => {
      // "hello" has 5 chars -> threshold = max(1, min(3, floor(5*0.25))) = 1
      setupQuestion({ correctAnswer: "hello", type: "fill_blank" });
      const result = await submitQuizAnswer(10, "helo"); // distance 1
      expect(result).toEqual({ isCorrect: true });
    });

    it("returns false for distant match", async () => {
      setupQuestion({ correctAnswer: "hello", type: "fill_blank" });
      const result = await submitQuizAnswer(10, "xyz"); // distance > 1
      expect(result).toEqual({ isCorrect: false });
    });

    it("matches against acceptable alternatives", async () => {
      setupQuestion({
        correctAnswer: "cat",
        type: "fill_blank",
        options: { acceptableAlternatives: ["kitty", "kitten"] },
      });
      const result = await submitQuizAnswer(10, "kitty");
      expect(result).toEqual({ isCorrect: true });
    });

    it("fuzzy-matches against acceptable alternatives", async () => {
      setupQuestion({
        correctAnswer: "cat",
        type: "fill_blank",
        // "kitten" = 6 chars -> threshold = max(1, min(3, floor(6*0.25))) = 1
        options: { acceptableAlternatives: ["kitten"] },
      });
      const result = await submitQuizAnswer(10, "kiten"); // distance 1 from "kitten"
      expect(result).toEqual({ isCorrect: true });
    });

    it("skips non-string alternatives", async () => {
      setupQuestion({
        correctAnswer: "xyz",
        type: "fill_blank",
        options: { acceptableAlternatives: [123, null, "cat"] },
      });
      // "cat" matches the alternative "cat", not the correct answer "xyz"
      const result = await submitQuizAnswer(10, "cat");
      expect(result).toEqual({ isCorrect: true });
    });

    it("skips all non-string alternatives and falls through", async () => {
      setupQuestion({
        correctAnswer: "xyz",
        type: "fill_blank",
        options: { acceptableAlternatives: [123, null, false] },
      });
      // No string alternatives and correct answer doesn't match
      const result = await submitQuizAnswer(10, "abc");
      expect(result).toEqual({ isCorrect: false });
    });

    it("handles non-array acceptableAlternatives gracefully", async () => {
      setupQuestion({
        correctAnswer: "cat",
        type: "fill_blank",
        options: { acceptableAlternatives: "not-an-array" },
      });
      const result = await submitQuizAnswer(10, "dog");
      expect(result).toEqual({ isCorrect: false });
    });

    it("returns false when alternatives exist but none match exactly or by Levenshtein", async () => {
      setupQuestion({
        correctAnswer: "cat",
        type: "fill_blank",
        options: { acceptableAlternatives: ["elephant", "giraffe"] },
      });
      const result = await submitQuizAnswer(10, "dog");
      expect(result).toEqual({ isCorrect: false });
    });

    it("handles options without acceptableAlternatives key", async () => {
      setupQuestion({
        correctAnswer: "cat",
        type: "fill_blank",
        options: { someOtherKey: true },
      });
      const result = await submitQuizAnswer(10, "dog");
      expect(result).toEqual({ isCorrect: false });
    });
  });

  describe("translation - fuzzy matching", () => {
    it("returns true for close translation match", async () => {
      // "ayubowan" = 8 chars -> threshold = max(1, min(3, floor(8*0.25))) = 2
      setupQuestion({ correctAnswer: "ayubowan", type: "translation" });
      const result = await submitQuizAnswer(10, "ayubovan"); // distance 1
      expect(result).toEqual({ isCorrect: true });
    });
  });

  describe("normalizeString edge cases", () => {
    it("strips punctuation and symbols", async () => {
      setupQuestion({ correctAnswer: "hello world", type: "mcq" });
      const result = await submitQuizAnswer(10, "hello, world!");
      expect(result).toEqual({ isCorrect: true });
    });

    it("collapses multiple spaces", async () => {
      setupQuestion({ correctAnswer: "hello world", type: "mcq" });
      const result = await submitQuizAnswer(10, "  hello    world  ");
      expect(result).toEqual({ isCorrect: true });
    });
  });

  describe("getLevenshteinThreshold edge cases", () => {
    it("returns 0 for empty string", async () => {
      // empty correct answer -> threshold 0 -> levenshtein("abc", "") = 3 > 0 -> false
      setupQuestion({ correctAnswer: "", type: "fill_blank" });
      const result = await submitQuizAnswer(10, "abc");
      expect(result).toEqual({ isCorrect: false });
    });

    it("caps threshold at 3 for very long strings", async () => {
      // 20 chars -> floor(20*0.25) = 5, capped to min(3,5) = 3
      const long = "abcdefghijklmnopqrst"; // 20 chars
      setupQuestion({ correctAnswer: long, type: "fill_blank" });
      // 4 edits away - should fail (threshold is 3)
      const result = await submitQuizAnswer(10, "abcdefghijklmnopXXXX");
      expect(result).toEqual({ isCorrect: false });
    });
  });
});

// =====================================================================
// createQuizSession
// =====================================================================
describe("createQuizSession", () => {
  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(createQuizSession("topic", "beginner", 1, 5)).rejects.toThrow(
      "Unauthorized."
    );
  });

  it("throws when user has no active course", async () => {
    mockGetUserProgress.mockResolvedValue(null);
    await expect(createQuizSession("topic", "beginner", 1, 5)).rejects.toThrow(
      "Invalid course or access denied."
    );
  });

  it("throws when courseId does not match active course", async () => {
    mockGetUserProgress.mockResolvedValue({ activeCourseId: 2 });
    await expect(createQuizSession("topic", "beginner", 1, 5)).rejects.toThrow(
      "Invalid course or access denied."
    );
  });

  it("throws when totalQuestions is 0", async () => {
    await expect(createQuizSession("topic", "beginner", 1, 0)).rejects.toThrow(
      "totalQuestions must be greater than 0."
    );
  });

  it("throws when totalQuestions is negative", async () => {
    await expect(createQuizSession("topic", "beginner", 1, -1)).rejects.toThrow(
      "totalQuestions must be greater than 0."
    );
  });

  it("creates a session and returns it", async () => {
    const mockSession = { id: 42, userId: "user-1", topic: "greetings" };
    dbMocks.returningFn.mockResolvedValue([mockSession]);

    const result = await createQuizSession("greetings", "beginner", 1, 5);

    expect(result).toEqual(mockSession);
    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/learn");
  });
});

// =====================================================================
// submitQuizAnswer
// =====================================================================
describe("submitQuizAnswer", () => {
  function setupQuestion(overrides: Record<string, unknown> = {}) {
    const base = {
      id: 10,
      sessionId: 1,
      type: "mcq" as const,
      question: "What?",
      options: null,
      correctAnswer: "hello",
      userAnswer: null,
      isCorrect: null,
      explanation: "test",
      order: 1,
      session: {
        id: 1,
        userId: "user-1",
        completedAt: null,
        correctAnswers: 0,
        totalQuestions: 5,
        difficulty: "beginner",
        courseId: 1,
      },
      ...overrides,
    };
    mockDbQuery.aiQuizQuestions.findFirst.mockResolvedValue(base);
    dbMocks.setFn.mockReturnValue({ where: dbMocks.whereFn });
    dbMocks.whereFn.mockReturnValue({ returning: dbMocks.returningFn });
    return base;
  }

  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(submitQuizAnswer(10, "answer")).rejects.toThrow(
      "Unauthorized."
    );
  });

  it("throws when answer is empty", async () => {
    await expect(submitQuizAnswer(10, "")).rejects.toThrow(
      "Answer cannot be empty."
    );
  });

  it("throws when answer is whitespace only", async () => {
    await expect(submitQuizAnswer(10, "   ")).rejects.toThrow(
      "Answer cannot be empty."
    );
  });

  it("throws when question is not found", async () => {
    mockDbQuery.aiQuizQuestions.findFirst.mockResolvedValue(null);
    await expect(submitQuizAnswer(10, "answer")).rejects.toThrow(
      "Question not found."
    );
  });

  it("throws when session belongs to another user", async () => {
    setupQuestion({
      session: { userId: "other-user", completedAt: null, correctAnswers: 0 },
    });
    await expect(submitQuizAnswer(10, "answer")).rejects.toThrow(
      "Unauthorized."
    );
  });

  it("throws when session is already completed", async () => {
    setupQuestion({
      session: { userId: "user-1", completedAt: new Date(), correctAnswers: 0 },
    });
    await expect(submitQuizAnswer(10, "answer")).rejects.toThrow(
      "Quiz session is already completed."
    );
  });

  it("increments correctAnswers when newly correct", async () => {
    setupQuestion({ correctAnswer: "hello", isCorrect: null });
    await submitQuizAnswer(10, "hello");
    // The update for session correctAnswers should be called
    expect(mockDbUpdate).toHaveBeenCalled();
  });

  it("decrements correctAnswers when was correct but now incorrect", async () => {
    setupQuestion({
      correctAnswer: "hello",
      isCorrect: true,
      session: {
        id: 1,
        userId: "user-1",
        completedAt: null,
        correctAnswers: 2,
        totalQuestions: 5,
        difficulty: "beginner",
        courseId: 1,
      },
    });
    await submitQuizAnswer(10, "wrong");
    expect(mockDbUpdate).toHaveBeenCalled();
  });

  it("does not change correctAnswers when answer stays incorrect", async () => {
    setupQuestion({ correctAnswer: "hello", isCorrect: false });
    // Clear mocks after setup
    mockDbUpdate.mockClear();
    dbMocks.setFn.mockReturnValue({ where: dbMocks.whereFn });
    dbMocks.whereFn.mockReturnValue({ returning: dbMocks.returningFn });

    await submitQuizAnswer(10, "wrong-answer");
    // First update call is for the question (userAnswer + isCorrect)
    // No second update call for session correctAnswers
    expect(mockDbUpdate).toHaveBeenCalledTimes(1);
  });

  it("does not change correctAnswers when answer stays correct", async () => {
    setupQuestion({ correctAnswer: "hello", isCorrect: true });
    mockDbUpdate.mockClear();
    dbMocks.setFn.mockReturnValue({ where: dbMocks.whereFn });
    dbMocks.whereFn.mockReturnValue({ returning: dbMocks.returningFn });

    await submitQuizAnswer(10, "hello");
    // Only 1 update for the question, no session update
    expect(mockDbUpdate).toHaveBeenCalledTimes(1);
  });

  it("calls revalidatePath after submission", async () => {
    setupQuestion({ correctAnswer: "hello" });
    await submitQuizAnswer(10, "hello");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/learn");
  });
});

// =====================================================================
// completeQuizSession
// =====================================================================
describe("completeQuizSession", () => {
  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(completeQuizSession(1)).rejects.toThrow("Unauthorized.");
  });

  it("throws when session not found", async () => {
    mockDbQuery.aiQuizSessions.findFirst.mockResolvedValue(null);
    await expect(completeQuizSession(1)).rejects.toThrow(
      "Session not found or unauthorized."
    );
  });

  it("returns xpAwarded: 0 for already completed session", async () => {
    const completedSession = {
      id: 1,
      userId: "user-1",
      completedAt: new Date(),
      correctAnswers: 3,
      totalQuestions: 5,
      difficulty: "beginner",
      courseId: 1,
    };
    mockDbQuery.aiQuizSessions.findFirst.mockResolvedValue(completedSession);
    const result = await completeQuizSession(1);
    expect(result).toEqual({ session: completedSession, xpAwarded: 0 });
  });

  it("completes session, awards XP and returns result", async () => {
    const session = {
      id: 1,
      userId: "user-1",
      completedAt: null,
      correctAnswers: 3,
      totalQuestions: 5,
      difficulty: "beginner",
      courseId: 1,
    };
    mockDbQuery.aiQuizSessions.findFirst.mockResolvedValue(session);

    const completedSession = { ...session, completedAt: new Date(), score: 60 };
    dbMocks.whereFn.mockReturnValue({
      returning: vi.fn().mockResolvedValue([completedSession]),
    });
    dbMocks.setFn.mockReturnValue({ where: dbMocks.whereFn });
    dbMocks.returningFn.mockResolvedValue([completedSession]);

    // Mock the insert for userProgress upsert
    const onConflictFn = vi.fn();
    const insertValuesFn = vi
      .fn()
      .mockReturnValue({ onConflictDoUpdate: onConflictFn });
    mockDbInsert.mockReturnValue({ values: insertValuesFn });

    const result = await completeQuizSession(1);

    // XP = 10 (base) + 3*2 (correct) + 0 (beginner) + 0 (not perfect) = 16
    expect(result.xpAwarded).toBe(16);
    expect(result.session).toEqual(completedSession);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/learn");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/quiz");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/quests");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/leaderboard");
  });

  it("awards intermediate difficulty bonus", async () => {
    const session = {
      id: 1,
      userId: "user-1",
      completedAt: null,
      correctAnswers: 2,
      totalQuestions: 5,
      difficulty: "intermediate" as const,
      courseId: 1,
    };
    mockDbQuery.aiQuizSessions.findFirst.mockResolvedValue(session);

    const completedSession = { ...session, completedAt: new Date(), score: 40 };
    dbMocks.whereFn.mockReturnValue({
      returning: vi.fn().mockResolvedValue([completedSession]),
    });
    dbMocks.setFn.mockReturnValue({ where: dbMocks.whereFn });

    const onConflictFn = vi.fn();
    const insertValuesFn = vi
      .fn()
      .mockReturnValue({ onConflictDoUpdate: onConflictFn });
    mockDbInsert.mockReturnValue({ values: insertValuesFn });

    const result = await completeQuizSession(1);
    // XP = 10 + 2*2 + 5 (intermediate) + 0 = 19
    expect(result.xpAwarded).toBe(19);
  });

  it("awards advanced difficulty bonus", async () => {
    const session = {
      id: 1,
      userId: "user-1",
      completedAt: null,
      correctAnswers: 2,
      totalQuestions: 5,
      difficulty: "advanced" as const,
      courseId: 1,
    };
    mockDbQuery.aiQuizSessions.findFirst.mockResolvedValue(session);

    const completedSession = { ...session, completedAt: new Date(), score: 40 };
    dbMocks.whereFn.mockReturnValue({
      returning: vi.fn().mockResolvedValue([completedSession]),
    });
    dbMocks.setFn.mockReturnValue({ where: dbMocks.whereFn });

    const onConflictFn = vi.fn();
    const insertValuesFn = vi
      .fn()
      .mockReturnValue({ onConflictDoUpdate: onConflictFn });
    mockDbInsert.mockReturnValue({ values: insertValuesFn });

    const result = await completeQuizSession(1);
    // XP = 10 + 2*2 + 10 (advanced) + 0 = 24
    expect(result.xpAwarded).toBe(24);
  });

  it("awards perfect bonus when all answers correct", async () => {
    const session = {
      id: 1,
      userId: "user-1",
      completedAt: null,
      correctAnswers: 5,
      totalQuestions: 5,
      difficulty: "beginner" as const,
      courseId: 1,
    };
    mockDbQuery.aiQuizSessions.findFirst.mockResolvedValue(session);

    const completedSession = {
      ...session,
      completedAt: new Date(),
      score: 100,
    };
    dbMocks.whereFn.mockReturnValue({
      returning: vi.fn().mockResolvedValue([completedSession]),
    });
    dbMocks.setFn.mockReturnValue({ where: dbMocks.whereFn });

    const onConflictFn = vi.fn();
    const insertValuesFn = vi
      .fn()
      .mockReturnValue({ onConflictDoUpdate: onConflictFn });
    mockDbInsert.mockReturnValue({ values: insertValuesFn });

    const result = await completeQuizSession(1);
    // XP = 10 + 5*2 + 0 + 20 (perfect) = 40
    expect(result.xpAwarded).toBe(40);
  });

  it("handles 0 total questions (score 0)", async () => {
    const session = {
      id: 1,
      userId: "user-1",
      completedAt: null,
      correctAnswers: 0,
      totalQuestions: 0,
      difficulty: "beginner" as const,
      courseId: 1,
    };
    mockDbQuery.aiQuizSessions.findFirst.mockResolvedValue(session);

    const completedSession = { ...session, completedAt: new Date(), score: 0 };
    dbMocks.whereFn.mockReturnValue({
      returning: vi.fn().mockResolvedValue([completedSession]),
    });
    dbMocks.setFn.mockReturnValue({ where: dbMocks.whereFn });

    const onConflictFn = vi.fn();
    const insertValuesFn = vi
      .fn()
      .mockReturnValue({ onConflictDoUpdate: onConflictFn });
    mockDbInsert.mockReturnValue({ values: insertValuesFn });

    const result = await completeQuizSession(1);
    // XP = 10 + 0 + 0 + 0 = 10
    expect(result.xpAwarded).toBe(10);
  });

  it("handles race condition where completedSession is null", async () => {
    const session = {
      id: 1,
      userId: "user-1",
      completedAt: null,
      correctAnswers: 3,
      totalQuestions: 5,
      difficulty: "beginner" as const,
      courseId: 1,
    };
    mockDbQuery.aiQuizSessions.findFirst.mockResolvedValueOnce(session);

    // The update returns no rows (another caller won the race)
    dbMocks.whereFn.mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    });
    dbMocks.setFn.mockReturnValue({ where: dbMocks.whereFn });

    // The re-fetch returns the now-completed session
    const existingCompleted = {
      ...session,
      completedAt: new Date(),
      score: 60,
    };
    mockDbQuery.aiQuizSessions.findFirst.mockResolvedValueOnce(
      existingCompleted
    );

    const result = await completeQuizSession(1);
    expect(result).toEqual({ session: existingCompleted, xpAwarded: 0 });
  });

  it("throws when race re-fetch also finds nothing", async () => {
    const session = {
      id: 1,
      userId: "user-1",
      completedAt: null,
      correctAnswers: 3,
      totalQuestions: 5,
      difficulty: "beginner" as const,
      courseId: 1,
    };
    mockDbQuery.aiQuizSessions.findFirst.mockResolvedValueOnce(session);

    // The update returns no rows
    dbMocks.whereFn.mockReturnValue({
      returning: vi.fn().mockResolvedValue([]),
    });
    dbMocks.setFn.mockReturnValue({ where: dbMocks.whereFn });

    // The re-fetch also returns null
    mockDbQuery.aiQuizSessions.findFirst.mockResolvedValueOnce(null);

    await expect(completeQuizSession(1)).rejects.toThrow(
      "Session not found or unauthorized."
    );
  });
});
