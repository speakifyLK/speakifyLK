import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockRetrieveContext = vi.hoisted(() => vi.fn());
const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/vertex-rag", () => ({
  retrieveContext: (...args: unknown[]) => mockRetrieveContext(...args),
}));

vi.mock("@/lib/gemini", () => ({
  generateContent: (...args: unknown[]) => mockGenerateContent(...args),
}));

import * as quizNormalise from "@/lib/quiz-normalise";
import {
  buildQuizRagRetrievalQuery,
  distributeQuestionCountByType,
  formatQuizRagChunksForPrompt,
  generateQuizWithRAG,
  getQuizContext,
} from "./quiz-rag";

const realParseGeminiQuizResponse = quizNormalise.parseGeminiQuizResponse.bind(quizNormalise);

function mcqJson(count: number): string {
  const items = Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      question: `Q${n}`,
      options: [
        { text: `Correct${n}`, isCorrect: true },
        { text: "w", isCorrect: false },
        { text: "x", isCorrect: false },
        { text: "y", isCorrect: false },
      ],
      explanation: `E${n}`,
    };
  });
  return JSON.stringify(items);
}

function fillJson(count: number): string {
  const items = Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      sentence: `මම ___ ${n}.`,
      answer: `A${n}`,
      hint: `H${n}`,
      explanation: `E${n}`,
    };
  });
  return JSON.stringify(items);
}

describe("quiz-rag module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRetrieveContext.mockResolvedValue([
      { text: "chunk one", source: "s1", score: 0.91 },
      { text: "chunk two", source: "s2", score: 0.82 },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("buildQuizRagRetrievalQuery", () => {
    it("includes trimmed topic and difficulty", () => {
      const q = buildQuizRagRetrievalQuery("  colours  ", "intermediate");
      expect(q).toContain("Topic: colours.");
      expect(q).toContain("Difficulty level: intermediate.");
      expect(q).toContain("SpeakifyLK Sinhala course content for quiz generation.");
    });
  });

  describe("formatQuizRagChunksForPrompt", () => {
    it("drops empty chunks and reindexes sources", () => {
      const s = formatQuizRagChunksForPrompt([
        { text: "", source: "a", score: 0.9 },
        { text: "   ", source: "b", score: 0.8 },
        { text: "hello", source: "c", score: 0 },
      ]);
      expect(s).toContain("[Source 1 | relevance: 0.00]");
      expect(s).toContain("hello");
      expect(s).not.toContain("[Source 2");
    });
  });

  describe("distributeQuestionCountByType", () => {
    it("returns an empty map for an empty type list", () => {
      expect(distributeQuestionCountByType(5, []).size).toBe(0);
    });

    it("assigns all questions to a single type", () => {
      const m = distributeQuestionCountByType(5, ["MULTIPLE_CHOICE"]);
      expect(m.get("MULTIPLE_CHOICE")).toBe(5);
    });

    it("splits with remainder going to earlier types", () => {
      const m = distributeQuestionCountByType(7, [
        "MULTIPLE_CHOICE",
        "FILL_IN_BLANK",
        "TRANSLATION",
      ]);
      expect(m.get("MULTIPLE_CHOICE")).toBe(3);
      expect(m.get("FILL_IN_BLANK")).toBe(2);
      expect(m.get("TRANSLATION")).toBe(2);
    });

    it("gives zero to later types when total is smaller than type count", () => {
      const m = distributeQuestionCountByType(1, ["MULTIPLE_CHOICE", "FILL_IN_BLANK"]);
      expect(m.get("MULTIPLE_CHOICE")).toBe(1);
      expect(m.get("FILL_IN_BLANK")).toBe(0);
    });
  });

  describe("getQuizContext", () => {
    it("calls retrieveContext with the tailored quiz query", async () => {
      await getQuizContext("greetings", "beginner");
      expect(mockRetrieveContext).toHaveBeenCalledTimes(1);
      const q = mockRetrieveContext.mock.calls[0][0] as string;
      expect(q).toContain("greetings");
      expect(q).toContain("beginner");
    });
  });

  describe("generateQuizWithRAG", () => {
    it("throws when questionTypes is empty", async () => {
      await expect(
        generateQuizWithRAG("greetings", "beginner", 5, [])
      ).rejects.toThrow('"questionTypes" must be a non-empty array.');
    });

    it("throws when retrieval returns no usable text", async () => {
      mockRetrieveContext.mockResolvedValueOnce([{ text: "", source: "x", score: 1 }]);
      await expect(
        generateQuizWithRAG("greetings", "beginner", 5, ["MULTIPLE_CHOICE"])
      ).rejects.toThrow("No course content was retrieved");
    });

    it("generates MCQ questions with RAG context", async () => {
      mockGenerateContent.mockResolvedValue({ text: mcqJson(2) });
      const out = await generateQuizWithRAG("greetings", "beginner", 2, ["MULTIPLE_CHOICE"]);
      expect(out).toHaveLength(2);
      expect(out.every((q) => q.type === "MULTIPLE_CHOICE")).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const prompt = mockGenerateContent.mock.calls[0][0] as string;
      expect(prompt).toContain("chunk one");
      expect(prompt).toContain("BEGIN COURSE CONTENT");
    });

    it("skips types with zero allocated count", async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: mcqJson(1) });
      const out = await generateQuizWithRAG("greetings", "beginner", 1, [
        "MULTIPLE_CHOICE",
        "FILL_IN_BLANK",
      ]);
      expect(out).toHaveLength(1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it("calls Gemini once per non-zero type in order", async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ text: mcqJson(2) })
        .mockResolvedValueOnce({ text: fillJson(1) });
      const out = await generateQuizWithRAG("greetings", "beginner", 3, [
        "MULTIPLE_CHOICE",
        "FILL_IN_BLANK",
      ]);
      expect(out).toHaveLength(3);
      expect(out.filter((q) => q.type === "MULTIPLE_CHOICE")).toHaveLength(2);
      expect(out.filter((q) => q.type === "FILL_IN_BLANK")).toHaveLength(1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("retries when the first response is invalid JSON then succeeds", async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ text: "not-json" })
        .mockResolvedValueOnce({ text: mcqJson(1) });
      const out = await generateQuizWithRAG("greetings", "beginner", 1, ["MULTIPLE_CHOICE"]);
      expect(out).toHaveLength(1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("retries when question count mismatches then succeeds", async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ text: mcqJson(2) })
        .mockResolvedValueOnce({ text: mcqJson(1) });
      const out = await generateQuizWithRAG("greetings", "beginner", 1, ["MULTIPLE_CHOICE"]);
      expect(out).toHaveLength(1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("uses empty string when Gemini returns no text field", async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ text: undefined })
        .mockResolvedValueOnce({ text: mcqJson(1) });
      const out = await generateQuizWithRAG("greetings", "beginner", 1, ["MULTIPLE_CHOICE"]);
      expect(out).toHaveLength(1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it("records non-Error failures from the parser", async () => {
      const spy = vi
        .spyOn(quizNormalise, "parseGeminiQuizResponse")
        .mockImplementationOnce(() => {
          throw "string failure";
        })
        .mockImplementation((...args) => realParseGeminiQuizResponse(...args));

      mockGenerateContent
        .mockResolvedValueOnce({ text: mcqJson(1) })
        .mockResolvedValueOnce({ text: mcqJson(1) });

      const out = await generateQuizWithRAG("greetings", "beginner", 1, ["MULTIPLE_CHOICE"]);
      expect(out).toHaveLength(1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      spy.mockRestore();
    });

    it("throws after exhausting retries", async () => {
      mockGenerateContent.mockResolvedValue({ text: "not-json" });
      await expect(
        generateQuizWithRAG("greetings", "beginner", 1, ["MULTIPLE_CHOICE"])
      ).rejects.toThrow("Failed to get valid RAG-grounded quiz JSON after 3 attempts");
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });
  });
});
