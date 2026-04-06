import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { ApiQuestionRow } from "../lib/rag-quiz-e2e-helpers";

const {
  mockGetQuizContext,
  mockGenerateQuizWithRAG,
  mockBuildQuizPrompt,
  mockGenerateContent,
  mockParse,
} = vi.hoisted(() => ({
  mockGetQuizContext: vi.fn().mockResolvedValue([]),
  mockGenerateQuizWithRAG: vi.fn().mockResolvedValue([]),
  mockBuildQuizPrompt: vi.fn().mockReturnValue("prompt"),
  mockGenerateContent: vi.fn().mockResolvedValue({ text: "{}" }),
  mockParse: vi.fn().mockReturnValue([]),
}));

vi.mock("../lib/quiz-rag", () => ({
  getQuizContext: (...args: unknown[]) => mockGetQuizContext(...args),
  generateQuizWithRAG: (...args: unknown[]) => mockGenerateQuizWithRAG(...args),
}));

vi.mock("../lib/quiz-prompt", () => ({
  buildQuizPrompt: (...args: unknown[]) => mockBuildQuizPrompt(...args),
}));

vi.mock("../lib/gemini", () => ({
  generateContent: (...args: unknown[]) => mockGenerateContent(...args),
}));

vi.mock("../lib/quiz-normalise", () => ({
  parseGeminiQuizResponse: (...args: unknown[]) => mockParse(...args),
}));

import { runRagQuizE2eMain } from "./test-rag-quiz";

function exitThrows(code?: string | number | null | undefined): never {
  throw new Error(`exit:${code ?? 0}`);
}

function mcqRow(id: number): ApiQuestionRow {
  return {
    id,
    type: "mcq",
    question: "Q?",
    correctAnswer: "a",
    explanation: "e",
    options: [
      { text: "ආx", isCorrect: true },
      { text: "bb", isCorrect: false },
      { text: "cc", isCorrect: false },
      { text: "dd", isCorrect: false },
    ],
  };
}

function fillRow(id: number): ApiQuestionRow {
  return {
    id,
    type: "fill_blank",
    question: "Say ___ please",
    correctAnswer: "hello",
    explanation: "",
  };
}

function trRow(id: number): ApiQuestionRow {
  return {
    id,
    type: "translation",
    question: "Hello",
    correctAnswer: "ආ",
    explanation: "",
  };
}

function nineValidQuestions(): ApiQuestionRow[] {
  return [
    mcqRow(1),
    mcqRow(2),
    mcqRow(3),
    fillRow(4),
    fillRow(5),
    fillRow(6),
    trRow(7),
    trRow(8),
    trRow(9),
  ];
}

describe("test-rag-quiz runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.stubEnv("GCP_PROJECT_ID", "test-project");
    vi.stubEnv("GCP_LOCATION", "us-central1");
    vi.stubEnv("RAG_CORPUS_ID", "corpus");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_KEY", "{}");
    vi.stubEnv("GEMINI_MODEL", "gemini-pro");
    Reflect.deleteProperty(process.env, "QUIZ_E2E_BASE_URL");
    Reflect.deleteProperty(process.env, "QUIZ_E2E_COOKIE");
    Reflect.deleteProperty(process.env, "QUIZ_E2E_NO_RAG_BASE_URL");
    mockGetQuizContext.mockResolvedValue([]);
    mockGenerateQuizWithRAG.mockResolvedValue([]);
    mockParse.mockReturnValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("exits with code 1 when a required env var is missing", async () => {
    Reflect.deleteProperty(process.env, "GCP_PROJECT_ID");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(exitThrows);
    await expect(runRagQuizE2eMain()).rejects.toThrow("exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
    vi.stubEnv("GCP_PROJECT_ID", "test-project");
  });

  it("completes the mocked library path without calling process.exit on success", async () => {
    const exitSpy = vi.spyOn(process, "exit");
    await runRagQuizE2eMain();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("formats RAG retrieval failures that are not Error instances", async () => {
    mockGetQuizContext.mockRejectedValueOnce("rag down");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(exitThrows);
    await expect(runRagQuizE2eMain()).rejects.toThrow("exit:1");
    exitSpy.mockRestore();
  });

  it("increments errors when RAG retrieval fails but still runs later stages", async () => {
    mockGetQuizContext.mockRejectedValueOnce(new Error("rag down"));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(exitThrows);
    await expect(runRagQuizE2eMain()).rejects.toThrow("exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it("logs chunk details when RAG returns non-empty chunks", async () => {
    mockGetQuizContext.mockResolvedValue([
      { text: "hello thank ආ lesson", source: "courses/unit1.md", score: 0.91 },
      { text: "   ", source: "empty.md", score: 0.1 },
      { text: "no slash source", source: "inline", score: 0.2 },
      { text: "trailing slash path", source: "folder/", score: 0.3 },
    ]);
    const exitSpy = vi.spyOn(process, "exit");
    await runRagQuizE2eMain();
    expect(mockGetQuizContext).toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("runs library RAG generation when HTTP is not configured and chunks exist", async () => {
    mockGetQuizContext.mockResolvedValue([
      { text: "hello world lesson", source: "a.md", score: 0.5 },
    ]);
    mockGenerateQuizWithRAG.mockResolvedValue([
      {
        type: "MULTIPLE_CHOICE",
        question: "Pick ආ greeting",
        correctAnswer: "lesson",
        explanation: "",
        options: [
          { text: "ආ", isCorrect: true },
          { text: "bb", isCorrect: false },
          { text: "cc", isCorrect: false },
          { text: "dd", isCorrect: false },
        ],
      },
    ]);
    const exitSpy = vi.spyOn(process, "exit");
    await runRagQuizE2eMain();
    expect(mockGenerateQuizWithRAG).toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("warns about low average vocab overlap in library RAG when vocab exists", async () => {
    mockGetQuizContext.mockResolvedValue([
      { text: "uniquecorpusword alpha", source: "a.md", score: 0.5 },
    ]);
    mockGenerateQuizWithRAG.mockResolvedValue([
      {
        type: "MULTIPLE_CHOICE",
        question: "unrelated text here",
        correctAnswer: "also unrelated",
        explanation: "",
        options: [
          { text: "ආ", isCorrect: true },
          { text: "bb", isCorrect: false },
          { text: "cc", isCorrect: false },
          { text: "dd", isCorrect: false },
        ],
      },
    ]);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(exitThrows);
    await runRagQuizE2eMain();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("counts warnings when library RAG returns questions without Sinhala", async () => {
    mockGetQuizContext.mockResolvedValue([{ text: "hello there", source: "a.md", score: 0.5 }]);
    mockGenerateQuizWithRAG.mockResolvedValue([
      {
        type: "MULTIPLE_CHOICE",
        question: "Pick",
        correctAnswer: "a",
        explanation: "",
        options: [
          { text: "aa", isCorrect: true },
          { text: "bb", isCorrect: false },
          { text: "cc", isCorrect: false },
          { text: "dd", isCorrect: false },
        ],
      },
    ]);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(exitThrows);
    await runRagQuizE2eMain();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("handles library RAG questions when retrieved chunks yield an empty vocab set", async () => {
    mockGetQuizContext.mockResolvedValue([{ text: "   \n\t  ", source: "blank.md", score: 0.1 }]);
    mockGenerateQuizWithRAG.mockResolvedValue([
      {
        type: "MULTIPLE_CHOICE",
        question: "Pick one",
        correctAnswer: "a",
        explanation: "",
        options: [
          { text: "a", isCorrect: true },
          { text: "bb", isCorrect: false },
          { text: "cc", isCorrect: false },
          { text: "dd", isCorrect: false },
        ],
      },
    ]);
    const exitSpy = vi.spyOn(process, "exit");
    await runRagQuizE2eMain();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("exercises fill-blank and translation branches inside library RAG loops", async () => {
    mockGetQuizContext.mockResolvedValue([
      { text: "hello lesson course", source: "a.md", score: 0.5 },
    ]);
    mockGenerateQuizWithRAG.mockImplementation(async (_topic, _d, _n, types: unknown[]) => {
      const t = types[0] as string;
      if (t === "MULTIPLE_CHOICE") {
        return [
          {
            type: "MULTIPLE_CHOICE",
            question: "Pick hello",
            correctAnswer: "lesson",
            explanation: "",
            options: [
              { text: "ආ", isCorrect: true },
              { text: "bb", isCorrect: false },
              { text: "cc", isCorrect: false },
              { text: "dd", isCorrect: false },
            ],
          },
        ];
      }
      if (t === "FILL_IN_BLANK") {
        return [
          {
            type: "FILL_IN_BLANK",
            question: "Say ___ please",
            correctAnswer: "hello",
            explanation: "",
          },
        ];
      }
      return [
        {
          type: "TRANSLATION",
          question: "greeting",
          correctAnswer: "ආ",
          explanation: "",
        },
      ];
    });
    const exitSpy = vi.spyOn(process, "exit");
    await runRagQuizE2eMain();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("handles generateQuizWithRAG rejection", async () => {
    mockGetQuizContext.mockResolvedValue([{ text: "word", source: "a.md", score: 0.5 }]);
    mockGenerateQuizWithRAG.mockRejectedValue(new Error("gen fail"));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(exitThrows);
    await expect(runRagQuizE2eMain()).rejects.toThrow("exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it("handles library RAG failure with a non-Error throw", async () => {
    mockGetQuizContext.mockResolvedValue([{ text: "w", source: "a.md", score: 0.5 }]);
    let calls = 0;
    mockGenerateQuizWithRAG.mockImplementation(async () => {
      calls++;
      if (calls === 1) throw "bad";
      return [];
    });
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(exitThrows);
    await expect(runRagQuizE2eMain()).rejects.toThrow("exit:1");
    exitSpy.mockRestore();
  });

  it("handles non-RAG library generation failure with non-Error throws", async () => {
    mockParse.mockImplementation(() => {
      throw "parse fail";
    });
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(exitThrows);
    await expect(runRagQuizE2eMain()).rejects.toThrow("exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it("treats missing Gemini text as empty when parsing no-RAG responses", async () => {
    mockGenerateContent.mockResolvedValue({ text: undefined as unknown as string });
    const exitSpy = vi.spyOn(process, "exit");
    await runRagQuizE2eMain();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("treats non-array questions in primary HTTP JSON as empty rows", async () => {
    vi.stubEnv("QUIZ_E2E_BASE_URL", "http://localhost:3000");
    vi.stubEnv("QUIZ_E2E_COOKIE", "c=1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ questions: "bad" as unknown as ApiQuestionRow[] }),
      })
    );
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(exitThrows);
    await expect(runRagQuizE2eMain()).rejects.toThrow("exit:1");
    exitSpy.mockRestore();
  });

  it("runs HTTP E2E when base URL and cookie are set", async () => {
    vi.stubEnv("QUIZ_E2E_BASE_URL", "http://localhost:3000");
    vi.stubEnv("QUIZ_E2E_COOKIE", "session=1");
    mockGetQuizContext.mockResolvedValue([{ text: "hello thank", source: "a.md", score: 0.8 }]);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ questions: nineValidQuestions() }),
      })
    );

    const exitSpy = vi.spyOn(process, "exit");
    await runRagQuizE2eMain();
    expect(fetch).toHaveBeenCalled();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("logs HTTP tip when second server URL is not set", async () => {
    vi.stubEnv("QUIZ_E2E_BASE_URL", "http://localhost:3000/");
    vi.stubEnv("QUIZ_E2E_COOKIE", "session=1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ questions: nineValidQuestions() }),
      })
    );
    const exitSpy = vi.spyOn(process, "exit");
    await runRagQuizE2eMain();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("calls second HTTP server when QUIZ_E2E_NO_RAG_BASE_URL is set", async () => {
    vi.stubEnv("QUIZ_E2E_BASE_URL", "http://primary.local");
    vi.stubEnv("QUIZ_E2E_NO_RAG_BASE_URL", "http://norag.local");
    vi.stubEnv("QUIZ_E2E_COOKIE", "c=1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ questions: nineValidQuestions() }),
      })
    );
    const exitSpy = vi.spyOn(process, "exit");
    await runRagQuizE2eMain();
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("increments errors on HTTP non-200", async () => {
    vi.stubEnv("QUIZ_E2E_BASE_URL", "http://localhost:3000");
    vi.stubEnv("QUIZ_E2E_COOKIE", "c=1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 500,
        json: async () => ({ err: true }),
      })
    );
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(exitThrows);
    await expect(runRagQuizE2eMain()).rejects.toThrow("exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it("increments errors when HTTP returns wrong question count", async () => {
    vi.stubEnv("QUIZ_E2E_BASE_URL", "http://localhost:3000");
    vi.stubEnv("QUIZ_E2E_COOKIE", "c=1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ questions: nineValidQuestions().slice(0, 4) }),
      })
    );
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(exitThrows);
    await expect(runRagQuizE2eMain()).rejects.toThrow("exit:1");
    exitSpy.mockRestore();
  });

  it("increments errors when an HTTP row has an unknown type", async () => {
    const bad = [...nineValidQuestions()];
    bad[0] = { ...bad[0]!, type: "weird" };
    vi.stubEnv("QUIZ_E2E_BASE_URL", "http://localhost:3000");
    vi.stubEnv("QUIZ_E2E_COOKIE", "c=1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ questions: bad }),
      })
    );
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(exitThrows);
    await expect(runRagQuizE2eMain()).rejects.toThrow("exit:1");
    exitSpy.mockRestore();
  });

  it("increments errors when primary HTTP POST throws a non-Error value", async () => {
    vi.stubEnv("QUIZ_E2E_BASE_URL", "http://localhost:3000");
    vi.stubEnv("QUIZ_E2E_COOKIE", "c=1");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue("network"));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(exitThrows);
    await expect(runRagQuizE2eMain()).rejects.toThrow("exit:1");
    exitSpy.mockRestore();
  });

  it("increments errors when HTTP POST throws", async () => {
    vi.stubEnv("QUIZ_E2E_BASE_URL", "http://localhost:3000");
    vi.stubEnv("QUIZ_E2E_COOKIE", "c=1");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(exitThrows);
    await expect(runRagQuizE2eMain()).rejects.toThrow("exit:1");
    exitSpy.mockRestore();
  });

  it("prints overlap comparison when RAG and no-RAG averages are available", async () => {
    vi.stubEnv("QUIZ_E2E_BASE_URL", "http://localhost:3000");
    vi.stubEnv("QUIZ_E2E_COOKIE", "c=1");
    mockGetQuizContext.mockResolvedValue([
      { text: "alpha beta gamma delta", source: "a.md", score: 0.5 },
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ questions: nineValidQuestions() }),
      })
    );
    mockParse.mockReturnValue([
      {
        type: "MULTIPLE_CHOICE",
        question: "alpha",
        correctAnswer: "beta",
        explanation: "",
        options: [],
      },
    ]);
    const exitSpy = vi.spyOn(process, "exit");
    await runRagQuizE2eMain();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("computes no-RAG HTTP vocab overlap when primary RAG built a non-empty vocab", async () => {
    vi.stubEnv("QUIZ_E2E_BASE_URL", "http://primary.local");
    vi.stubEnv("QUIZ_E2E_NO_RAG_BASE_URL", "http://norag.local");
    vi.stubEnv("QUIZ_E2E_COOKIE", "c=1");
    mockGetQuizContext.mockResolvedValue([
      { text: "hello world course material here", source: "a.md", score: 0.5 },
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ questions: nineValidQuestions() }),
      })
    );
    const exitSpy = vi.spyOn(process, "exit");
    await runRagQuizE2eMain();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("increments errors when no-RAG HTTP returns non-200", async () => {
    vi.stubEnv("QUIZ_E2E_BASE_URL", "http://primary.local");
    vi.stubEnv("QUIZ_E2E_NO_RAG_BASE_URL", "http://norag.local");
    vi.stubEnv("QUIZ_E2E_COOKIE", "c=1");
    let n = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        n++;
        if (n === 1) {
          return { status: 200, json: async () => ({ questions: nineValidQuestions() }) };
        }
        return { status: 502, json: async () => ({}) };
      })
    );
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(exitThrows);
    await expect(runRagQuizE2eMain()).rejects.toThrow("exit:1");
    exitSpy.mockRestore();
  });

  it("treats non-array questions in no-RAG HTTP JSON as empty rows", async () => {
    vi.stubEnv("QUIZ_E2E_BASE_URL", "http://primary.local");
    vi.stubEnv("QUIZ_E2E_NO_RAG_BASE_URL", "http://norag.local");
    vi.stubEnv("QUIZ_E2E_COOKIE", "c=1");
    mockGetQuizContext.mockResolvedValue([{ text: "hello world", source: "a.md", score: 0.5 }]);
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        call++;
        if (call === 1) {
          return { status: 200, json: async () => ({ questions: nineValidQuestions() }) };
        }
        return {
          status: 200,
          json: async () => ({ questions: { x: 1 } as unknown as ApiQuestionRow[] }),
        };
      })
    );
    const exitSpy = vi.spyOn(process, "exit");
    await runRagQuizE2eMain();
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it("increments errors when no-RAG HTTP throws", async () => {
    vi.stubEnv("QUIZ_E2E_BASE_URL", "http://primary.local");
    vi.stubEnv("QUIZ_E2E_NO_RAG_BASE_URL", "http://norag.local");
    vi.stubEnv("QUIZ_E2E_COOKIE", "c=1");
    let n = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        n++;
        if (n === 1) {
          return { status: 200, json: async () => ({ questions: nineValidQuestions() }) };
        }
        throw "norag net";
      })
    );
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(exitThrows);
    await expect(runRagQuizE2eMain()).rejects.toThrow("exit:1");
    exitSpy.mockRestore();
  });

  it("skips per-question overlap log in section 4 when vocab is empty", async () => {
    mockGetQuizContext.mockResolvedValue([]);
    mockParse.mockReturnValue([
      {
        type: "MULTIPLE_CHOICE",
        question: "hello",
        correctAnswer: "world",
        explanation: "",
        options: [],
      },
    ]);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit");
    await runRagQuizE2eMain();
    expect(
      logSpy.mock.calls.some((c) => String(c[0]).includes("vocab overlap with RAG corpus:"))
    ).toBe(false);
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("logs per-question vocab overlap in section 4 when overlap is non-negative", async () => {
    mockGetQuizContext.mockResolvedValue([
      { text: "hello planet vocabulary", source: "a.md", score: 0.5 },
    ]);
    mockParse.mockImplementation((_text: string, internal: string) => {
      if (internal === "MULTIPLE_CHOICE") {
        return [
          {
            type: "MULTIPLE_CHOICE",
            question: "hello there",
            correctAnswer: "planet",
            explanation: "",
            options: [],
          },
        ];
      }
      return [];
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit");
    await runRagQuizE2eMain();
    expect(
      logSpy.mock.calls.some((c) => String(c[0]).includes("vocab overlap with RAG corpus:"))
    ).toBe(true);
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("prints all three overlap delta indicator styles in section 4", async () => {
    mockGetQuizContext.mockResolvedValue([
      { text: "onlyragword alpha beta gamma", source: "a.md", score: 0.5 },
    ]);
    mockGenerateQuizWithRAG.mockImplementation(async (_topic, _diff, _count, types) => {
      const t = types[0];
      if (t === "MULTIPLE_CHOICE") {
        return [
          {
            type: "MULTIPLE_CHOICE",
            question: "onlyragword stem",
            correctAnswer: "alpha",
            explanation: "",
            options: [
              { text: "ආ", isCorrect: true },
              { text: "bb", isCorrect: false },
              { text: "cc", isCorrect: false },
              { text: "dd", isCorrect: false },
            ],
          },
        ];
      }
      if (t === "FILL_IN_BLANK") {
        return [
          {
            type: "FILL_IN_BLANK",
            question: "Say ___ please",
            correctAnswer: "onlyragword",
            explanation: "",
          },
        ];
      }
      return [
        {
          type: "TRANSLATION",
          question: "zzz unrelated",
          correctAnswer: "yyy",
          explanation: "",
        },
      ];
    });
    mockParse.mockImplementation((_text: string, internal: string) => {
      if (internal === "MULTIPLE_CHOICE") {
        return [
          {
            type: "MULTIPLE_CHOICE",
            question: "zzz",
            correctAnswer: "yyy",
            explanation: "",
            options: [],
          },
        ];
      }
      if (internal === "FILL_IN_BLANK") {
        return [
          {
            type: "FILL_IN_BLANK",
            question: "Say ___ please",
            correctAnswer: "onlyragword",
            explanation: "",
          },
        ];
      }
      return [
        {
          type: "TRANSLATION",
          question: "onlyragword phrase",
          correctAnswer: "alpha",
          explanation: "",
        },
      ];
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit");
    await runRagQuizE2eMain();
    const joined = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toContain("+");
    expect(joined).toContain("no difference");
    expect(joined).toMatch(/\-\d+%/);
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("uses numeric RAG timing when library generation finishes with zero questions but non-zero elapsed", async () => {
    vi.useFakeTimers();
    mockGetQuizContext.mockResolvedValue([{ text: "w", source: "a.md", score: 0.5 }]);
    mockGenerateQuizWithRAG.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve([]), 50);
        })
    );
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit");
    const runPromise = runRagQuizE2eMain();
    await vi.advanceTimersByTimeAsync(200);
    await runPromise;
    const text = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(text).toMatch(/MCQ\s+\d+ms/);
    expect(text).not.toMatch(/MCQ\s+skip/);
    logSpy.mockRestore();
    exitSpy.mockRestore();
    vi.useRealTimers();
  });

  it("omits plus sign when HTTP no-RAG duration is less than primary HTTP duration", async () => {
    vi.stubEnv("QUIZ_E2E_BASE_URL", "http://primary.local");
    vi.stubEnv("QUIZ_E2E_NO_RAG_BASE_URL", "http://norag.local");
    vi.stubEnv("QUIZ_E2E_COOKIE", "c=1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ questions: nineValidQuestions() }),
      })
    );
    let idx = 0;
    const seq = [10_000, 20_000, 10_000, 12_000];
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => {
      const v = seq[Math.min(idx, seq.length - 1)]!;
      idx++;
      return v;
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit");
    await runRagQuizE2eMain();
    const httpLine = logSpy.mock.calls
      .map((c) => String(c[0]))
      .find((s) => s.includes("HTTP (no-RAG server)"));
    expect(httpLine).toBeDefined();
    expect(httpLine).toMatch(/Δ -\d+ms/);
    expect(httpLine).not.toMatch(/Δ \+\d+ms/);
    nowSpy.mockRestore();
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
