import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  RAG_E2E_TOPIC,
  RAG_E2E_API_QUESTION_COUNT,
  GREETING_ANCHORS,
  anchorHitsInText,
  buildVocabSet,
  hasSinhala,
  internalTypeFromApi,
  overlapPct,
  postQuizGenerate,
  reportGrounding,
  toGeneratedQ,
  validateFillBlank,
  validateMcq,
  validateTranslation,
  type GeneratedQ,
  type McqOption,
  type RagE2eReporters,
  type Tally,
} from "./rag-quiz-e2e-helpers";

function reporters(spies: {
  ok: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  fail: ReturnType<typeof vi.fn>;
  log: ReturnType<typeof vi.fn>;
}): RagE2eReporters {
  return spies as RagE2eReporters;
}

describe("rag-quiz-e2e-helpers", () => {
  describe("constants", () => {
    it("exports expected topic and question count", () => {
      expect(RAG_E2E_TOPIC).toBe("Greetings");
      expect(RAG_E2E_API_QUESTION_COUNT).toBe(9);
      expect(GREETING_ANCHORS.length).toBeGreaterThan(0);
    });
  });

  describe("hasSinhala", () => {
    it("detects Sinhala codepoints", () => {
      expect(hasSinhala("ආයුබෝවන්")).toBe(true);
    });
    it("returns false for ASCII only", () => {
      expect(hasSinhala("hello world")).toBe(false);
    });
  });

  describe("buildVocabSet", () => {
    it("collects lowercased tokens of length >= 2", () => {
      const v = buildVocabSet(["Hello, world!", "foo-bar"]);
      expect(v.has("hello")).toBe(true);
      expect(v.has("world")).toBe(true);
      expect(v.has("foo")).toBe(true);
      expect(v.has("bar")).toBe(true);
    });
  });

  describe("overlapPct", () => {
    it("returns -1 for empty vocab", () => {
      expect(overlapPct("hello world", new Set())).toBe(-1);
    });
    it("returns 0 when no tokenizable words", () => {
      expect(overlapPct("a", new Set(["a"]))).toBe(0);
    });
    it("computes percentage of words in vocab", () => {
      const v = new Set(["one", "two"]);
      expect(overlapPct("one two three", v)).toBe(67);
    });
  });

  describe("anchorHitsInText", () => {
    it("finds case-insensitive anchor substrings", () => {
      const hits = anchorHitsInText("Say HELLO and thank you");
      expect(hits).toContain("hello");
      expect(hits).toContain("thank");
    });
  });

  describe("internalTypeFromApi", () => {
    it("maps known API types", () => {
      expect(internalTypeFromApi("mcq")).toBe("MULTIPLE_CHOICE");
      expect(internalTypeFromApi("fill_blank")).toBe("FILL_IN_BLANK");
      expect(internalTypeFromApi("translation")).toBe("TRANSLATION");
    });
    it("returns null for unknown", () => {
      expect(internalTypeFromApi("unknown")).toBeNull();
    });
  });

  describe("toGeneratedQ", () => {
    it("returns null when type is unknown", () => {
      expect(
        toGeneratedQ({
          id: 1,
          type: "x",
          question: "q",
          correctAnswer: "a",
        })
      ).toBeNull();
    });
    it("normalizes row fields", () => {
      const g = toGeneratedQ({
        id: 1,
        type: "mcq",
        question: "Q?",
        correctAnswer: "A",
        options: [],
        explanation: "e",
      });
      expect(g).toMatchObject({
        type: "MULTIPLE_CHOICE",
        question: "Q?",
        correctAnswer: "A",
        explanation: "e",
      });
    });
    it("uses empty strings for missing question/answer and non-string explanation", () => {
      const g = toGeneratedQ({
        id: 1,
        type: "translation",
        question: null as unknown as string,
        correctAnswer: undefined as unknown as string,
        explanation: 1 as unknown as string,
      });
      expect(g!.question).toBe("");
      expect(g!.correctAnswer).toBe("");
      expect(g!.explanation).toBe("");
    });
  });

  describe("validateMcq", () => {
    const baseQ = (opts: unknown): GeneratedQ => ({
      type: "MULTIPLE_CHOICE",
      question: "q",
      correctAnswer: "a",
      options: opts,
      explanation: "",
    });

    it("fails when options are not length 4", () => {
      const tally: Tally = { errors: 0, warnings: 0 };
      const r = reporters({ ok: vi.fn(), warn: vi.fn(), fail: vi.fn(), log: vi.fn() });
      validateMcq(baseQ([{ text: "a", isCorrect: true }]), 1, new Set(["x"]), tally, r);
      expect(tally.errors).toBe(1);
      expect(r.fail).toHaveBeenCalled();
    });

    it("fails with 'none' when options is not an array", () => {
      const tally: Tally = { errors: 0, warnings: 0 };
      const r = reporters({ ok: vi.fn(), warn: vi.fn(), fail: vi.fn(), log: vi.fn() });
      validateMcq(baseQ({} as unknown as McqOption[]), 1, new Set(), tally, r);
      expect(tally.errors).toBe(1);
      expect(String(vi.mocked(r.fail).mock.calls[0]?.[0])).toContain("none");
    });

    it("fails when not exactly one correct option", () => {
      const tally: Tally = { errors: 0, warnings: 0 };
      const r = reporters({ ok: vi.fn(), warn: vi.fn(), fail: vi.fn(), log: vi.fn() });
      const opts = [
        { text: "a", isCorrect: true },
        { text: "b", isCorrect: true },
        { text: "c", isCorrect: false },
        { text: "d", isCorrect: false },
      ];
      validateMcq(baseQ(opts), 1, new Set(), tally, r);
      expect(tally.errors).toBe(1);
    });

    it("warns when no Sinhala in options", () => {
      const tally: Tally = { errors: 0, warnings: 0 };
      const r = reporters({ ok: vi.fn(), warn: vi.fn(), fail: vi.fn(), log: vi.fn() });
      const opts = [
        { text: "a", isCorrect: true },
        { text: "b", isCorrect: false },
        { text: "c", isCorrect: false },
        { text: "d", isCorrect: false },
      ];
      validateMcq(baseQ(opts), 1, new Set(["token"]), tally, r);
      expect(tally.warnings).toBeGreaterThanOrEqual(1);
      expect(r.warn).toHaveBeenCalled();
    });

    it("warns when all distractors are zero overlap and no Sinhala", () => {
      const tally: Tally = { errors: 0, warnings: 0 };
      const r = reporters({ ok: vi.fn(), warn: vi.fn(), fail: vi.fn(), log: vi.fn() });
      const vocab = new Set(["lesson"]);
      const opts = [
        { text: "lesson", isCorrect: true },
        { text: "zzz", isCorrect: false },
        { text: "yyy", isCorrect: false },
        { text: "xxx", isCorrect: false },
      ];
      validateMcq(baseQ(opts), 1, vocab, tally, r);
      expect(r.warn).toHaveBeenCalled();
      expect(tally.warnings).toBeGreaterThan(0);
    });

    it("warns for partial suspicious distractors", () => {
      const tally: Tally = { errors: 0, warnings: 0 };
      const r = reporters({ ok: vi.fn(), warn: vi.fn(), fail: vi.fn(), log: vi.fn() });
      const vocab = new Set(["lesson"]);
      const opts = [
        { text: "lesson", isCorrect: true },
        { text: "lesson", isCorrect: false },
        { text: "zzz", isCorrect: false },
        { text: "xxx", isCorrect: false },
      ];
      validateMcq(baseQ(opts), 1, vocab, tally, r);
      expect(r.warn).toHaveBeenCalled();
    });

    it("ok path with Sinhala in an option", () => {
      const tally: Tally = { errors: 0, warnings: 0 };
      const r = reporters({ ok: vi.fn(), warn: vi.fn(), fail: vi.fn(), log: vi.fn() });
      const opts = [
        { text: "ආ", isCorrect: true },
        { text: "b", isCorrect: false },
        { text: "c", isCorrect: false },
        { text: "d", isCorrect: false },
      ];
      validateMcq(baseQ(opts), 1, new Set(), tally, r);
      expect(tally.errors).toBe(0);
      expect(r.ok).toHaveBeenCalled();
    });
  });

  describe("validateFillBlank", () => {
    it("warns without blank marker", () => {
      const tally: Tally = { errors: 0, warnings: 0 };
      const r = reporters({ ok: vi.fn(), warn: vi.fn(), fail: vi.fn(), log: vi.fn() });
      validateFillBlank(
        { type: "FILL_IN_BLANK", question: "no blank", correctAnswer: "x", explanation: "" },
        1,
        tally,
        r
      );
      expect(r.warn).toHaveBeenCalled();
    });
    it("fails on empty answer", () => {
      const tally: Tally = { errors: 0, warnings: 0 };
      const r = reporters({ ok: vi.fn(), warn: vi.fn(), fail: vi.fn(), log: vi.fn() });
      validateFillBlank(
        { type: "FILL_IN_BLANK", question: "fill ___", correctAnswer: "  ", explanation: "" },
        1,
        tally,
        r
      );
      expect(tally.errors).toBe(1);
    });
    it("accepts ellipsis blank", () => {
      const tally: Tally = { errors: 0, warnings: 0 };
      const r = reporters({ ok: vi.fn(), warn: vi.fn(), fail: vi.fn(), log: vi.fn() });
      validateFillBlank(
        { type: "FILL_IN_BLANK", question: "a…b", correctAnswer: "ok", explanation: "" },
        1,
        tally,
        r
      );
      expect(r.ok).toHaveBeenCalled();
      expect(tally.errors).toBe(0);
    });
  });

  describe("validateTranslation", () => {
    it("fails on empty question", () => {
      const tally: Tally = { errors: 0, warnings: 0 };
      const r = reporters({ ok: vi.fn(), warn: vi.fn(), fail: vi.fn(), log: vi.fn() });
      validateTranslation(
        { type: "TRANSLATION", question: "  ", correctAnswer: "x", explanation: "" },
        1,
        tally,
        r
      );
      expect(tally.errors).toBe(1);
    });
    it("fails on empty target", () => {
      const tally: Tally = { errors: 0, warnings: 0 };
      const r = reporters({ ok: vi.fn(), warn: vi.fn(), fail: vi.fn(), log: vi.fn() });
      validateTranslation(
        { type: "TRANSLATION", question: "src", correctAnswer: "", explanation: "" },
        1,
        tally,
        r
      );
      expect(tally.errors).toBe(1);
    });
  });

  describe("reportGrounding", () => {
    it("logs overlap and ok for anchors", () => {
      const tally: Tally = { errors: 0, warnings: 0 };
      const r = reporters({ ok: vi.fn(), warn: vi.fn(), fail: vi.fn(), log: vi.fn() });
      const vocab = new Set(["hello", "there"]);
      reportGrounding(
        {
          type: "MULTIPLE_CHOICE",
          question: "hello",
          correctAnswer: "there",
          explanation: "",
          options: [],
        },
        1,
        vocab,
        tally,
        r
      );
      expect(r.log).toHaveBeenCalled();
      expect(r.ok).toHaveBeenCalled();
    });
    it("warns on low overlap without anchors", () => {
      const tally: Tally = { errors: 0, warnings: 0 };
      const r = reporters({ ok: vi.fn(), warn: vi.fn(), fail: vi.fn(), log: vi.fn() });
      const vocab = new Set(["only"]);
      reportGrounding(
        {
          type: "MULTIPLE_CHOICE",
          question: "zzz",
          correctAnswer: "yyy",
          explanation: "",
          options: [],
        },
        1,
        vocab,
        tally,
        r
      );
      expect(tally.warnings).toBe(1);
    });

    it("skips overlap log when vocab is empty", () => {
      const tally: Tally = { errors: 0, warnings: 0 };
      const r = reporters({ ok: vi.fn(), warn: vi.fn(), fail: vi.fn(), log: vi.fn() });
      reportGrounding(
        {
          type: "MULTIPLE_CHOICE",
          question: "hello",
          correctAnswer: "world",
          explanation: "",
          options: [],
        },
        1,
        new Set(),
        tally,
        r
      );
      expect(r.log).not.toHaveBeenCalled();
    });

    it("does not warn when overlap is 10% or more without anchors", () => {
      const tally: Tally = { errors: 0, warnings: 0 };
      const r = reporters({ ok: vi.fn(), warn: vi.fn(), fail: vi.fn(), log: vi.fn() });
      const vocab = new Set(["match"]);
      const filler = Array.from({ length: 9 }, () => "aa").join(" ");
      const combined = `match ${filler}`;
      reportGrounding(
        {
          type: "MULTIPLE_CHOICE",
          question: combined,
          correctAnswer: "",
          explanation: "",
          options: [],
        },
        1,
        vocab,
        tally,
        r
      );
      expect(overlapPct(combined, vocab)).toBe(10);
      expect(tally.warnings).toBe(0);
      expect(r.warn).not.toHaveBeenCalled();
    });
  });

  describe("postQuizGenerate", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ questions: [] }),
        })
      );
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("strips trailing slash from base URL and returns parsed JSON", async () => {
      const res = await postQuizGenerate("http://localhost:3000/", "cookie=1");
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/quiz/generate",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ Cookie: "cookie=1" }),
        })
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ questions: [] });
      expect(res.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("sets body null when json throws", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          status: 500,
          json: async () => {
            throw new Error("bad json");
          },
        })
      );
      const res = await postQuizGenerate("http://x", "");
      expect(res.body).toBeNull();
    });
  });
});
