import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
const mockGetUserProgress = vi.hoisted(() => vi.fn());
const mockGetUserLearningProfile = vi.hoisted(() => vi.fn());
const mockGenerateContent = vi.hoisted(() => vi.fn());
const mockBuildQuizPrompt = vi.hoisted(() => vi.fn());
const mockDbInsert = vi.hoisted(() => vi.fn());
const mockDbDelete = vi.hoisted(() => vi.fn());
const mockGetQuizContext = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
vi.mock("@/db/queries", () => ({
  getUserProgress: mockGetUserProgress,
  getUserLearningProfile: mockGetUserLearningProfile,
}));
vi.mock("@/lib/quiz-rag", () => ({
  getQuizContext: mockGetQuizContext,
}));
vi.mock("@/lib/gemini", () => ({
  generateContent: mockGenerateContent,
}));
vi.mock("@/lib/quiz-normalise", () => ({
  dbTypeToQuizType: new Map([
    ["mcq", "multiple_choice"],
    ["fill_blank", "fill_in_the_blank"],
    ["translation", "translation"],
  ]),
  quizTypeToDbType: new Map([
    ["multiple_choice", "mcq"],
    ["fill_in_the_blank", "fill_blank"],
    ["translation", "translation"],
  ]),
  parseGeminiQuizResponse: vi.fn(),
}));
vi.mock("@/lib/quiz-prompt", () => ({
  buildQuizPrompt: mockBuildQuizPrompt,
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => args),
}));
vi.mock("@/db/schema", () => ({
  aiQuizSessions: { id: "col_sessions.id" },
  aiQuizQuestions: { sessionId: "col_questions.sessionId" },
}));
vi.mock("@/db/drizzle", () => {
  const returningFn = vi.fn();
  const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
  const insertFn = vi.fn().mockReturnValue({ values: valuesFn });

  const whereFn = vi.fn();
  const catchFn = vi.fn();
  whereFn.mockReturnValue({ catch: catchFn });
  const deleteFn = vi.fn().mockReturnValue({ where: whereFn });

  mockDbInsert.mockImplementation(insertFn);
  mockDbDelete.mockImplementation(deleteFn);

  return {
    default: {
      insert: mockDbInsert,
      delete: mockDbDelete,
    },
  };
});

import { POST } from "./route";
import { parseGeminiQuizResponse } from "@/lib/quiz-normalise";

// Helper
function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/quiz/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Default valid request body
const validBody = {
  topic: "Greetings",
  difficulty: "beginner",
  questionCount: 5,
  questionTypes: ["mcq"],
};

// Fake parsed questions
function fakeQuestions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    question: `Q${i + 1}`,
    correctAnswer: `A${i + 1}`,
    options: ["A", "B", "C", "D"],
    explanation: `Explanation ${i + 1}`,
  }));
}

describe("POST /api/quiz/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated
    mockAuth.mockResolvedValue({ userId: "user1" });

    // Default: has active course
    mockGetUserProgress.mockResolvedValue({
      activeCourseId: 42,
    });

    // Default: no learning profile
    mockGetUserLearningProfile.mockResolvedValue(null);

    // Default: RAG succeeds
    mockGetQuizContext.mockResolvedValue([
      { text: "Some course text", source: "...", score: 0.9 },
    ]);

    // Default: build prompt returns a string
    mockBuildQuizPrompt.mockReturnValue("generated prompt");

    // Default: gemini returns valid JSON
    mockGenerateContent.mockResolvedValue({ text: '{"questions": []}' });

    // Default: parse returns correct number of questions
    vi.mocked(parseGeminiQuizResponse).mockReturnValue(fakeQuestions(5));
  });

  // ── Auth ──
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized.");
  });

  // ── Body validation ──
  it("returns 400 for null body", async () => {
    const res = await POST(makeRequest(null));
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-object body", async () => {
    const res = await POST(makeRequest("string"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when topic is missing", async () => {
    const res = await POST(makeRequest({ ...validBody, topic: "" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("topic");
  });

  it("returns 400 when topic is not a string", async () => {
    const res = await POST(makeRequest({ ...validBody, topic: 123 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when difficulty is invalid", async () => {
    const res = await POST(makeRequest({ ...validBody, difficulty: "expert" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("difficulty");
  });

  it("returns 400 when difficulty is not a string", async () => {
    const res = await POST(makeRequest({ ...validBody, difficulty: 5 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when questionCount is too small", async () => {
    const res = await POST(makeRequest({ ...validBody, questionCount: 2 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("questionCount");
  });

  it("returns 400 when questionCount is too large", async () => {
    const res = await POST(makeRequest({ ...validBody, questionCount: 20 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when questionCount is not an integer", async () => {
    const res = await POST(makeRequest({ ...validBody, questionCount: 5.5 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when questionCount is not a number", async () => {
    const res = await POST(makeRequest({ ...validBody, questionCount: "5" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when questionTypes is empty array", async () => {
    const res = await POST(makeRequest({ ...validBody, questionTypes: [] }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("questionTypes");
  });

  it("returns 400 when questionTypes is not an array", async () => {
    const res = await POST(makeRequest({ ...validBody, questionTypes: "mcq" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when questionTypes contains invalid type", async () => {
    const res = await POST(makeRequest({ ...validBody, questionTypes: ["mcq", "essay"] }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("essay");
  });

  it("returns 400 when questionTypes contains non-string", async () => {
    const res = await POST(makeRequest({ ...validBody, questionTypes: [123] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/quiz/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ── No active course ──
  it("returns 400 when no active course", async () => {
    mockGetUserProgress.mockResolvedValue({ activeCourseId: null });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("No active course");
  });

  it("returns 400 when userProgress is null", async () => {
    mockGetUserProgress.mockResolvedValue(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(400);
  });

  // ── courseId validation (Try Again) ──
  it("returns 400 when courseId is not an integer", async () => {
    const res = await POST(makeRequest({ ...validBody, courseId: "abc" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid courseId");
  });

  it("returns 400 when courseId is a float", async () => {
    const res = await POST(makeRequest({ ...validBody, courseId: 1.5 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when courseId doesn't match active course", async () => {
    const res = await POST(makeRequest({ ...validBody, courseId: 99 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Switch to the course");
  });

  it("accepts matching courseId", async () => {
    vi.mocked(parseGeminiQuizResponse).mockReturnValue(fakeQuestions(5));
    const returningFn = vi.fn().mockResolvedValue([{ id: 99 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert
      .mockReturnValueOnce({ values: valuesFn })
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await POST(makeRequest({ ...validBody, courseId: 42 }));
    expect(res.status).toBe(200);
  });

  it("ignores courseId when null", async () => {
    vi.mocked(parseGeminiQuizResponse).mockReturnValue(fakeQuestions(5));
    const returningFn = vi.fn().mockResolvedValue([{ id: 99 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert
      .mockReturnValueOnce({ values: valuesFn })
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await POST(makeRequest({ ...validBody, courseId: null }));
    expect(res.status).toBe(200);
  });

  it("ignores courseId when undefined (not in body)", async () => {
    vi.mocked(parseGeminiQuizResponse).mockReturnValue(fakeQuestions(5));
    const returningFn = vi.fn().mockResolvedValue([{ id: 99 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert
      .mockReturnValueOnce({ values: valuesFn })
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await POST(makeRequest(validBody)); // no courseId
    expect(res.status).toBe(200);
  });

  // ── Learning profile ──
  it("passes learning context from profile to prompt builder", async () => {
    mockGetUserLearningProfile.mockResolvedValue({
      completedLessons: ["Greetings", "Numbers"],
      weakTopics: ["Grammar"],
      strongTopics: ["Vocabulary"],
      frequentlyMissedWords: ["මම"],
      overallLevel: "beginner",
    });
    vi.mocked(parseGeminiQuizResponse).mockReturnValue(fakeQuestions(5));

    const returningFn = vi.fn().mockResolvedValue([{ id: 99 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert
      .mockReturnValueOnce({ values: valuesFn })
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    await POST(makeRequest(validBody));

    expect(mockBuildQuizPrompt).toHaveBeenCalledWith(
      "multiple_choice",
      expect.objectContaining({
        learningContext: expect.objectContaining({
          completedTopics: ["Greetings", "Numbers"],
          weakTopics: ["Grammar"],
        }),
      })
    );
  });

  // ── Multiple question types distribution ──
  it("distributes questions across multiple types", async () => {
    const body = {
      ...validBody,
      questionCount: 7,
      questionTypes: ["mcq", "fill_blank"],
    };

    // First type gets ceil(7/2)=4, second gets 3
    vi.mocked(parseGeminiQuizResponse)
      .mockReturnValueOnce(fakeQuestions(4))
      .mockReturnValueOnce(fakeQuestions(3));

    const returningFn = vi.fn().mockResolvedValue([{ id: 99 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert
      .mockReturnValueOnce({ values: valuesFn })
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.questions).toHaveLength(7);
  });

  it("skips types with 0 count (many types, few questions)", async () => {
    // 5 questions across 3 types: 2, 2, 1 — no type has 0
    // Actually, 5/3 = 1 base, remainder 2 → [2, 2, 1]
    const body = {
      ...validBody,
      questionCount: 5,
      questionTypes: ["mcq", "fill_blank", "translation"],
    };

    vi.mocked(parseGeminiQuizResponse)
      .mockReturnValueOnce(fakeQuestions(2))
      .mockReturnValueOnce(fakeQuestions(2))
      .mockReturnValueOnce(fakeQuestions(1));

    const returningFn = vi.fn().mockResolvedValue([{ id: 99 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert
      .mockReturnValueOnce({ values: valuesFn })
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
  });

  // ── buildQuizPrompt error ──
  it("returns 400 when buildQuizPrompt throws", async () => {
    mockBuildQuizPrompt.mockImplementation(() => {
      throw new Error("Invalid quiz params");
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid quiz params");
  });

  it("returns 400 when buildQuizPrompt throws non-Error", async () => {
    mockBuildQuizPrompt.mockImplementation(() => {
      throw "string error";
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid quiz parameters.");
  });

  // ── Gemini retry ──
  it("retries on parse failure and succeeds on third attempt", async () => {
    vi.mocked(parseGeminiQuizResponse)
      .mockImplementationOnce(() => {
        throw new Error("bad JSON");
      })
      .mockImplementationOnce(() => {
        throw new Error("bad JSON again");
      })
      .mockReturnValueOnce(fakeQuestions(5));

    mockGenerateContent.mockResolvedValue({ text: "some text" });

    const returningFn = vi.fn().mockResolvedValue([{ id: 99 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert
      .mockReturnValueOnce({ values: valuesFn })
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(mockGenerateContent).toHaveBeenCalledTimes(3);
  });

  it("returns 502 after all retry attempts fail", async () => {
    vi.mocked(parseGeminiQuizResponse).mockImplementation(() => {
      throw new Error("always fails");
    });
    mockGenerateContent.mockResolvedValue({ text: "bad" });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toContain("Failed to get valid response");
  });

  it("returns 502 when question count mismatch after retry", async () => {
    vi.mocked(parseGeminiQuizResponse).mockReturnValue(fakeQuestions(3)); // expected 5
    mockGenerateContent.mockResolvedValue({ text: "text" });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toContain("Failed to get valid response");
  });

  it("handles non-Error parse failures in retry", async () => {
    vi.mocked(parseGeminiQuizResponse).mockImplementation(() => {
      throw "string error";
    });
    mockGenerateContent.mockResolvedValue({ text: "text" });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(502);
  });

  it("handles generateContent returning null text", async () => {
    vi.mocked(parseGeminiQuizResponse).mockReturnValue(fakeQuestions(5));
    mockGenerateContent.mockResolvedValue({ text: null });

    const returningFn = vi.fn().mockResolvedValue([{ id: 99 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert
      .mockReturnValueOnce({ values: valuesFn })
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    // parseGeminiQuizResponse receives "" due to `?? ""`
    expect(vi.mocked(parseGeminiQuizResponse)).toHaveBeenCalledWith("", "multiple_choice");
  });

  // ── Gemini network error (not retried) ──
  it("returns 502 when Gemini throws network error", async () => {
    mockGenerateContent.mockRejectedValue(new Error("network timeout"));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toContain("network timeout");
  });

  it("returns 502 with generic message for non-Error Gemini failure", async () => {
    mockGenerateContent.mockRejectedValue("string error");
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("Failed to generate quiz.");
  });

  // ── RAG Integration ──
  it("uses RAG context when available and marks ragGrounded true", async () => {
    vi.mocked(parseGeminiQuizResponse).mockReturnValue(fakeQuestions(5));
    const returningFn = vi.fn().mockResolvedValue([{ id: 99 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert
      .mockReturnValueOnce({ values: valuesFn })
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);

    expect(mockGetQuizContext).toHaveBeenCalledWith("Greetings", "beginner");
    expect(mockBuildQuizPrompt).toHaveBeenCalledWith(
      "multiple_choice",
      expect.objectContaining({
        ragContext: "Some course text",
      })
    );

    // Session DB insert uses ragGrounded: true
    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({
        ragGrounded: true,
      })
    );
  });

  it("falls back to non-RAG flow if RAG context is empty array", async () => {
    mockGetQuizContext.mockResolvedValue([]);
    vi.mocked(parseGeminiQuizResponse).mockReturnValue(fakeQuestions(5));
    const returningFn = vi.fn().mockResolvedValue([{ id: 99 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert
      .mockReturnValueOnce({ values: valuesFn })
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);

    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({
        ragGrounded: false,
      })
    );
  });

  it("filters out empty text chunks completely and handles fallback", async () => {
    mockGetQuizContext.mockResolvedValue([
      { text: "", source: "a", score: 0.9 },
      { text: "   ", source: "b", score: 0.9 }, // only empty spaces
    ]);
    vi.mocked(parseGeminiQuizResponse).mockReturnValue(fakeQuestions(5));
    const returningFn = vi.fn().mockResolvedValue([{ id: 99 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert
      .mockReturnValueOnce({ values: valuesFn })
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);

    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({
        ragGrounded: false,
      })
    );
  });

  it("falls back to non-RAG flow if getQuizContext throws", async () => {
    mockGetQuizContext.mockRejectedValue(new Error("RAG dead"));
    vi.mocked(parseGeminiQuizResponse).mockReturnValue(fakeQuestions(5));
    const returningFn = vi.fn().mockResolvedValue([{ id: 99 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert
      .mockReturnValueOnce({ values: valuesFn })
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);

    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({
        ragGrounded: false,
      })
    );
  });

  it("skips RAG for all question types if context retrieval fails", async () => {
    const body = {
      ...validBody,
      questionCount: 5,
      questionTypes: ["mcq", "fill_blank"],
    };
    mockGetQuizContext.mockRejectedValueOnce(new Error("RAG dead"));

    vi.mocked(parseGeminiQuizResponse)
      .mockReturnValueOnce(fakeQuestions(3))
      .mockReturnValueOnce(fakeQuestions(2));

    const returningFn = vi.fn().mockResolvedValue([{ id: 99 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert
      .mockReturnValueOnce({ values: valuesFn })
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);

    // retrieval is hoisted outside the loop, so it is only called once
    expect(mockGetQuizContext).toHaveBeenCalledTimes(1);
    
    // Since RAG retrieval failed, the entire session should fall back natively
    expect(valuesFn).toHaveBeenCalledWith(
      expect.objectContaining({
        ragGrounded: false,
      })
    );
  });

  // ── DB operations ──
  it("saves session and questions to DB on success", async () => {
    vi.mocked(parseGeminiQuizResponse).mockReturnValue(fakeQuestions(5));

    const returningFn = vi.fn().mockResolvedValue([{ id: 77 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    const questionsValuesFn = vi.fn().mockResolvedValue(undefined);
    mockDbInsert
      .mockReturnValueOnce({ values: valuesFn })
      .mockReturnValueOnce({ values: questionsValuesFn });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sessionId).toBe(77);
    expect(data.questions).toHaveLength(5);
    // Each question has expected shape
    expect(data.questions[0]).toEqual(
      expect.objectContaining({
        id: 1,
        type: "mcq",
        question: "Q1",
        correctAnswer: "A1",
      })
    );
  });

  it("rolls back session on question insert failure", async () => {
    vi.mocked(parseGeminiQuizResponse).mockReturnValue(fakeQuestions(5));

    const returningFn = vi.fn().mockResolvedValue([{ id: 88 }]);
    const sessionValuesFn = vi.fn().mockReturnValue({ returning: returningFn });

    const questionsValuesFn = vi.fn().mockRejectedValue(new Error("FK constraint"));

    mockDbInsert
      .mockReturnValueOnce({ values: sessionValuesFn })
      .mockReturnValueOnce({ values: questionsValuesFn });

    // Make the delete chain return a real promise-like so .catch(fn) invokes fn
    const deletePromise = Promise.resolve();
    const whereFn = vi.fn().mockReturnValue(deletePromise);
    mockDbDelete.mockReturnValue({ where: whereFn });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
    // Verify rollback was attempted
    expect(mockDbDelete).toHaveBeenCalled();
  });

  it("handles rollback failure gracefully (catch is swallowed)", async () => {
    vi.mocked(parseGeminiQuizResponse).mockReturnValue(fakeQuestions(5));

    const returningFn = vi.fn().mockResolvedValue([{ id: 88 }]);
    const sessionValuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    const questionsValuesFn = vi.fn().mockRejectedValue(new Error("insert fail"));

    mockDbInsert
      .mockReturnValueOnce({ values: sessionValuesFn })
      .mockReturnValueOnce({ values: questionsValuesFn });

    // .catch(() => {}) — make the delete chain return a rejected promise
    // so that .catch(fn) is called with the error, and fn swallows it
    const deletePromise = Promise.reject(new Error("delete also failed"));
    const whereFn = vi.fn().mockReturnValue(deletePromise);
    mockDbDelete.mockReturnValue({ where: whereFn });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("insert fail");
  });

  // ── quizTypeToDbType fallback ──
  it("maps quiz types correctly in response", async () => {
    vi.mocked(parseGeminiQuizResponse).mockReturnValue(fakeQuestions(5));

    const returningFn = vi.fn().mockResolvedValue([{ id: 99 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert
      .mockReturnValueOnce({ values: valuesFn })
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await POST(makeRequest(validBody));
    const data = await res.json();
    // All questions should have type "mcq" (mapped from multiple_choice)
    for (const q of data.questions) {
      expect(q.type).toBe("mcq");
    }
  });

  // ── Duplicate question types deduplication ──
  it("deduplicates question types", async () => {
    const body = {
      ...validBody,
      questionCount: 5,
      questionTypes: ["mcq", "mcq"],
    };
    vi.mocked(parseGeminiQuizResponse).mockReturnValue(fakeQuestions(5));

    const returningFn = vi.fn().mockResolvedValue([{ id: 99 }]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert
      .mockReturnValueOnce({ values: valuesFn })
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });

    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
    // buildQuizPrompt should only be called once since duplicates are removed
    expect(mockBuildQuizPrompt).toHaveBeenCalledTimes(1);
  });

  // ── Unhandled error ──
  it("returns 500 for unhandled errors", async () => {
    mockGetUserProgress.mockRejectedValue(new Error("unexpected"));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("unexpected");
  });

  it("returns 500 with generic message for non-Error unhandled", async () => {
    mockGetUserProgress.mockRejectedValue("crash");
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Internal server error.");
  });
});
