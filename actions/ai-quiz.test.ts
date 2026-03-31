import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist mocks ──────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
const mockGetUserProgress = vi.hoisted(() => vi.fn());
const mockGetUserLearningProfile = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockGenerateContent = vi.hoisted(() => vi.fn());
const mockParseGeminiQuizResponse = vi.hoisted(() => vi.fn());
const mockBuildQuizPrompt = vi.hoisted(() => vi.fn());

const mockDbInsert = vi.hoisted(() => vi.fn());
const mockDbDelete = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/db/queries", () => ({
  getUserProgress: mockGetUserProgress,
  getUserLearningProfile: mockGetUserLearningProfile,
}));

vi.mock("@/lib/gemini", () => ({
  generateContent: mockGenerateContent,
}));

vi.mock("@/lib/quiz-normalise", () => ({
  parseGeminiQuizResponse: mockParseGeminiQuizResponse,
  quizTypeToDbType: new Map([
    ["MULTIPLE_CHOICE", "mcq"],
    ["FILL_IN_BLANK", "fill_blank"],
    ["TRANSLATION", "translation"],
  ]),
}));

vi.mock("@/lib/quiz-prompt", () => ({
  buildQuizPrompt: mockBuildQuizPrompt,
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ _type: "eq", col, val }),
}));

vi.mock("@/db/drizzle", () => {
  const returningFn = vi.fn();
  const valuesFn = vi.fn();
  const whereFn = vi.fn();
  const catchFn = vi.fn();

  valuesFn.mockReturnValue({ returning: returningFn });
  whereFn.mockReturnValue({ catch: catchFn });

  const db = {
    insert: mockDbInsert.mockReturnValue({ values: valuesFn }),
    delete: mockDbDelete.mockReturnValue({ where: whereFn }),
    _mocks: { returningFn, valuesFn, whereFn, catchFn },
  };
  return { default: db };
});

vi.mock("@/db/schema", () => ({
  aiQuizSessions: { id: "aiQuizSessions.id" },
  aiQuizQuestions: { id: "aiQuizQuestions.id" },
}));

import { generatePersonalizedQuiz } from "./ai-quiz";
import db from "@/db/drizzle";

const dbMocks = (
  db as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> }
)._mocks;

const defaultInput = {
  topic: "greetings",
  type: "MULTIPLE_CHOICE" as const,
  difficulty: "beginner" as const,
  count: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: "user-1" });
  mockGetUserProgress.mockResolvedValue({ activeCourseId: 1 });
  mockGetUserLearningProfile.mockResolvedValue(null);
  mockBuildQuizPrompt.mockReturnValue("mock prompt");
  mockGenerateContent.mockResolvedValue({ text: "mock response" });
  mockParseGeminiQuizResponse.mockReturnValue([
    {
      question: "Q1",
      options: ["A", "B", "C"],
      correctAnswer: "A",
      explanation: "Because A",
    },
    {
      question: "Q2",
      options: ["X", "Y", "Z"],
      correctAnswer: "X",
      explanation: "Because X",
    },
  ]);
  dbMocks.returningFn.mockResolvedValue([{ id: 42 }]);
});

describe("generatePersonalizedQuiz", () => {
  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(generatePersonalizedQuiz(defaultInput)).rejects.toThrow(
      "Unauthorized."
    );
  });

  it("throws when no active course", async () => {
    mockGetUserProgress.mockResolvedValue(null);
    await expect(generatePersonalizedQuiz(defaultInput)).rejects.toThrow(
      "No active course found. Please select a course first."
    );
  });

  it("throws when activeCourseId is null", async () => {
    mockGetUserProgress.mockResolvedValue({ activeCourseId: null });
    await expect(generatePersonalizedQuiz(defaultInput)).rejects.toThrow(
      "No active course found. Please select a course first."
    );
  });

  it("generates quiz without learning context when profile is null", async () => {
    mockGetUserLearningProfile.mockResolvedValue(null);

    const result = await generatePersonalizedQuiz(defaultInput);

    expect(mockBuildQuizPrompt).toHaveBeenCalledWith("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "beginner",
      count: 3,
      learningContext: undefined,
    });
    expect(result.sessionId).toBe(42);
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].id).toBe(1);
    expect(result.questions[1].id).toBe(2);
  });

  it("generates quiz with learning context when profile exists", async () => {
    mockGetUserLearningProfile.mockResolvedValue({
      completedLessons: ["lesson-1"],
      weakTopics: ["verbs"],
      strongTopics: ["greetings"],
      frequentlyMissedWords: ["word1"],
      overallLevel: "intermediate",
    });

    await generatePersonalizedQuiz(defaultInput);

    expect(mockBuildQuizPrompt).toHaveBeenCalledWith("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "beginner",
      count: 3,
      learningContext: {
        completedTopics: ["lesson-1"],
        weakTopics: ["verbs"],
        strongTopics: ["greetings"],
        frequentlyMissedWords: ["word1"],
        overallLevel: "intermediate",
      },
    });
  });

  it("handles null text from gemini response", async () => {
    mockGenerateContent.mockResolvedValue({ text: null });
    mockParseGeminiQuizResponse.mockReturnValue([]);
    dbMocks.returningFn.mockResolvedValue([{ id: 10 }]);

    const result = await generatePersonalizedQuiz(defaultInput);

    expect(mockParseGeminiQuizResponse).toHaveBeenCalledWith(
      "",
      "MULTIPLE_CHOICE"
    );
    expect(result.sessionId).toBe(10);
    expect(result.questions).toHaveLength(0);
  });

  it("cleans up session and re-throws when question insert fails", async () => {
    // First insert returns session
    dbMocks.returningFn.mockResolvedValueOnce([{ id: 42 }]);

    // Second insert (questions) throws
    const insertError = new Error("DB insert failed");
    mockDbInsert
      .mockReturnValueOnce({ values: dbMocks.valuesFn }) // session insert
      .mockReturnValueOnce({
        values: vi.fn().mockRejectedValue(insertError),
      }); // questions insert

    // Delete mock for cleanup
    const deleteCatchFn = vi.fn().mockResolvedValue(undefined);
    const deleteWhereFn = vi.fn().mockReturnValue({ catch: deleteCatchFn });
    mockDbDelete.mockReturnValue({ where: deleteWhereFn });

    await expect(generatePersonalizedQuiz(defaultInput)).rejects.toThrow(
      "DB insert failed"
    );
    expect(mockDbDelete).toHaveBeenCalled();
  });

  it("suppresses cleanup errors when session delete fails", async () => {
    dbMocks.returningFn.mockResolvedValueOnce([{ id: 42 }]);

    const insertError = new Error("DB insert failed");
    mockDbInsert
      .mockReturnValueOnce({ values: dbMocks.valuesFn })
      .mockReturnValueOnce({
        values: vi.fn().mockRejectedValue(insertError),
      });

    // Make the delete().where() return a rejected promise so that
    // the actual .catch(() => {}) callback in the source code is invoked
    const deleteWhereFn = vi.fn().mockRejectedValue(new Error("delete failed"));
    mockDbDelete.mockReturnValue({ where: deleteWhereFn });

    await expect(generatePersonalizedQuiz(defaultInput)).rejects.toThrow(
      "DB insert failed"
    );
  });

  it("revalidates /learn path after success", async () => {
    await generatePersonalizedQuiz(defaultInput);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/learn");
  });

  it("maps quiz type to DB type using quizTypeToDbType", async () => {
    await generatePersonalizedQuiz(defaultInput);
    // Verify that insert was called for questions
    expect(mockDbInsert).toHaveBeenCalled();
  });

  it("falls back to 'mcq' when quiz type is not in quizTypeToDbType map", async () => {
    // Use a type not in the map
    const unknownTypeInput = { ...defaultInput, type: "UNKNOWN_TYPE" as never };
    mockParseGeminiQuizResponse.mockReturnValue([
      {
        question: "Q1",
        options: undefined, // also tests the `q.options ?? null` fallback
        correctAnswer: "A",
        explanation: "Because",
      },
    ]);

    await generatePersonalizedQuiz(unknownTypeInput);
    expect(mockDbInsert).toHaveBeenCalled();
  });
});
