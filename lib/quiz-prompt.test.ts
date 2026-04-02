import { describe, it, expect } from "vitest";
import { buildQuizPrompt } from "./quiz-prompt";
import type { QuizType, QuizPromptParams } from "./quiz-prompt";

// ═══════════════════════════════════════════════════════════════════════
// buildQuizPrompt — Input Validation
// ═══════════════════════════════════════════════════════════════════════

describe("buildQuizPrompt — input validation", () => {
  const validParams: QuizPromptParams = {
    topic: "greetings",
    difficulty: "beginner",
    count: 5,
  };

  // ── Count validation ──

  it("throws for count of 0", () => {
    expect(() => buildQuizPrompt("MULTIPLE_CHOICE", { ...validParams, count: 0 })).toThrow(
      /positive integer/
    );
  });

  it("throws for negative count", () => {
    expect(() => buildQuizPrompt("MULTIPLE_CHOICE", { ...validParams, count: -1 })).toThrow(
      /positive integer/
    );
  });

  it("throws for non-integer count", () => {
    expect(() => buildQuizPrompt("MULTIPLE_CHOICE", { ...validParams, count: 2.5 })).toThrow(
      /positive integer/
    );
  });

  it("throws for count exceeding maximum (20)", () => {
    expect(() => buildQuizPrompt("MULTIPLE_CHOICE", { ...validParams, count: 21 })).toThrow(
      /must not exceed/
    );
  });

  it("accepts count at maximum boundary (20)", () => {
    expect(() => buildQuizPrompt("MULTIPLE_CHOICE", { ...validParams, count: 20 })).not.toThrow();
  });

  it("accepts count of 1 (minimum)", () => {
    expect(() => buildQuizPrompt("MULTIPLE_CHOICE", { ...validParams, count: 1 })).not.toThrow();
  });

  // ── Topic validation ──

  it("throws for empty topic", () => {
    expect(() => buildQuizPrompt("MULTIPLE_CHOICE", { ...validParams, topic: "" })).toThrow(
      /must not be empty/
    );
  });

  it("throws for whitespace-only topic", () => {
    expect(() => buildQuizPrompt("MULTIPLE_CHOICE", { ...validParams, topic: "   " })).toThrow(
      /must not be empty/
    );
  });

  it("throws for topic exceeding 100 characters", () => {
    const longTopic = "a".repeat(101);
    expect(() => buildQuizPrompt("MULTIPLE_CHOICE", { ...validParams, topic: longTopic })).toThrow(
      /must not exceed/
    );
  });

  it("accepts topic at 100 character boundary", () => {
    const maxTopic = "a".repeat(100);
    expect(() =>
      buildQuizPrompt("MULTIPLE_CHOICE", { ...validParams, topic: maxTopic })
    ).not.toThrow();
  });

  it("throws for topic with special characters (injection attempt)", () => {
    expect(() =>
      buildQuizPrompt("MULTIPLE_CHOICE", {
        ...validParams,
        topic: 'greetings"; DROP TABLE users;--',
      })
    ).toThrow(/invalid characters/);
  });

  it("accepts topic with basic Unicode letters (no combining marks)", () => {
    // Simple Latin, digits, spaces, hyphens — always valid
    expect(() =>
      buildQuizPrompt("MULTIPLE_CHOICE", {
        ...validParams,
        topic: "food and drinks",
      })
    ).not.toThrow();
  });

  it("rejects topic with Unicode combining marks (Sinhala vowel signs)", () => {
    // Sinhala dependent vowels like  ි (U+0DD2) are \p{M} (Mark), not \p{L} (Letter)
    // The SAFE_TOPIC_PATTERN intentionally rejects these for security
    expect(() => buildQuizPrompt("MULTIPLE_CHOICE", { ...validParams, topic: "සිංහල" })).toThrow(
      /invalid characters/
    );
  });

  it("accepts topic with hyphens and apostrophes", () => {
    expect(() =>
      buildQuizPrompt("MULTIPLE_CHOICE", {
        ...validParams,
        topic: "day-to-day greetings",
      })
    ).not.toThrow();
  });

  // ── Quiz type validation ──

  it("throws for unknown quiz type", () => {
    expect(() => buildQuizPrompt("UNKNOWN_TYPE" as QuizType, validParams)).toThrow(
      /Unknown quiz type/
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// buildQuizPrompt — Prompt Content
// ═══════════════════════════════════════════════════════════════════════

describe("buildQuizPrompt — MULTIPLE_CHOICE output", () => {
  it("includes topic in the prompt", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "beginner",
      count: 5,
    });
    expect(prompt).toContain("greetings");
  });

  it("includes question count in the prompt", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "beginner",
      count: 7,
    });
    expect(prompt).toContain("7");
  });

  it("includes beginner difficulty guidelines", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "beginner",
      count: 5,
    });
    expect(prompt).toContain("simple");
    expect(prompt).toContain("transliteration");
  });

  it("includes intermediate difficulty guidelines", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "intermediate",
      count: 5,
    });
    expect(prompt).toContain("moderately complex");
  });

  it("includes advanced difficulty guidelines", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "advanced",
      count: 5,
    });
    expect(prompt).toContain("formal");
    expect(prompt).toContain("idiomatic");
  });

  it("includes JSON instruction", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "beginner",
      count: 5,
    });
    expect(prompt).toContain("CRITICAL INSTRUCTIONS");
    expect(prompt).toContain("valid JSON");
  });

  it("mentions MULTIPLE-CHOICE in the prompt", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "beginner",
      count: 5,
    });
    expect(prompt).toContain("MULTIPLE-CHOICE");
  });
});

describe("buildQuizPrompt — FILL_IN_BLANK output", () => {
  it("mentions FILL-IN-THE-BLANK in the prompt", () => {
    const prompt = buildQuizPrompt("FILL_IN_BLANK", {
      topic: "verbs",
      difficulty: "intermediate",
      count: 5,
    });
    expect(prompt).toContain("FILL-IN-THE-BLANK");
  });

  it("includes sentence and answer in format description", () => {
    const prompt = buildQuizPrompt("FILL_IN_BLANK", {
      topic: "verbs",
      difficulty: "intermediate",
      count: 5,
    });
    expect(prompt).toContain("sentence");
    expect(prompt).toContain("answer");
    expect(prompt).toContain("hint");
  });
});

describe("buildQuizPrompt — TRANSLATION output", () => {
  it("mentions TRANSLATION in the prompt", () => {
    const prompt = buildQuizPrompt("TRANSLATION", {
      topic: "food",
      difficulty: "advanced",
      count: 5,
    });
    expect(prompt).toContain("TRANSLATION");
  });

  it("includes sourceText and correctTranslation in format", () => {
    const prompt = buildQuizPrompt("TRANSLATION", {
      topic: "food",
      difficulty: "advanced",
      count: 5,
    });
    expect(prompt).toContain("sourceText");
    expect(prompt).toContain("correctTranslation");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// buildQuizPrompt — Learning Context personalisation
// ═══════════════════════════════════════════════════════════════════════

describe("buildQuizPrompt — with learningContext", () => {
  it("includes completed topics in prompt", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "beginner",
      count: 5,
      learningContext: {
        completedTopics: ["Hello", "Goodbye"],
        weakTopics: [],
        strongTopics: [],
        frequentlyMissedWords: [],
        overallLevel: "beginner",
      },
    });
    expect(prompt).toContain("Hello");
    expect(prompt).toContain("Goodbye");
    expect(prompt).toContain("completed");
  });

  it("includes weak topics in prompt", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "beginner",
      count: 5,
      learningContext: {
        completedTopics: [],
        weakTopics: ["Numbers", "Colours"],
        strongTopics: [],
        frequentlyMissedWords: [],
        overallLevel: "beginner",
      },
    });
    expect(prompt).toContain("Numbers");
    expect(prompt).toContain("STRUGGLE");
  });

  it("includes frequently missed words", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "beginner",
      count: 5,
      learningContext: {
        completedTopics: [],
        weakTopics: [],
        strongTopics: [],
        frequentlyMissedWords: ["ආයුබෝවන්", "ස්තූතියි"],
        overallLevel: "beginner",
      },
    });
    expect(prompt).toContain("ආයුබෝවන්");
    expect(prompt).toContain("frequently get wrong");
  });

  it("includes strong topics in prompt", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "beginner",
      count: 5,
      learningContext: {
        completedTopics: [],
        weakTopics: [],
        strongTopics: ["Alphabet", "Vowels"],
        frequentlyMissedWords: [],
        overallLevel: "beginner",
      },
    });
    expect(prompt).toContain("Alphabet");
    expect(prompt).toContain("Vowels");
    expect(prompt).toContain("STRONG");
  });

  it("does not include personalisation block when context is undefined", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "beginner",
      count: 5,
    });
    expect(prompt).not.toContain("PERSONALISATION");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// buildQuizPrompt — RAG Context
// ═══════════════════════════════════════════════════════════════════════

describe("buildQuizPrompt — with ragContext", () => {
  const sampleRag = [
    "Source 1 — Lesson: Greetings, Unit: Basics",
    "ආයුබෝවන් (aayubowan) = Hello",
    "ස්තූතියි (sthuthiyi) = Thank you",
    "",
    "Source 2 — Lesson: Colours, Unit: Vocabulary",
    "රතු (rathu) = Red",
    "නිල් (nil) = Blue",
  ].join("\n");

  const baseParams: QuizPromptParams = {
    topic: "greetings",
    difficulty: "beginner",
    count: 5,
    ragContext: sampleRag,
  };

  // ── RAG block appears in all three prompt types ──

  it("MULTIPLE_CHOICE prompt includes COURSE CONTENT instruction", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", baseParams);
    expect(prompt).toContain("Use ONLY the following course content to generate questions");
  });

  it("FILL_IN_BLANK prompt includes COURSE CONTENT instruction", () => {
    const prompt = buildQuizPrompt("FILL_IN_BLANK", baseParams);
    expect(prompt).toContain("Use ONLY the following course content to generate questions");
  });

  it("TRANSLATION prompt includes COURSE CONTENT instruction", () => {
    const prompt = buildQuizPrompt("TRANSLATION", baseParams);
    expect(prompt).toContain("Use ONLY the following course content to generate questions");
  });

  // ── RAG chunks are embedded verbatim ──

  it("embeds raw RAG chunks in the prompt", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", baseParams);
    expect(prompt).toContain("Source 1 — Lesson: Greetings, Unit: Basics");
    expect(prompt).toContain("ආයුබෝවන් (aayubowan) = Hello");
    expect(prompt).toContain("Source 2 — Lesson: Colours, Unit: Vocabulary");
    expect(prompt).toContain("රතු (rathu) = Red");
  });

  // ── Source-referencing requirement ──

  it("instructs Gemini to reference specific source content", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", baseParams);
    expect(prompt).toContain(
      "Each question MUST reference specific content from the sources above"
    );
    expect(prompt).toContain("Do not invent facts, vocabulary, or sentences");
  });

  // ── Translation-specific vocabulary constraint ──

  it("TRANSLATION prompt includes vocabulary constraint with ragContext", () => {
    const prompt = buildQuizPrompt("TRANSLATION", baseParams);
    expect(prompt).toContain(
      "source and target text for each translation MUST come from actual vocabulary"
    );
    expect(prompt).toContain("Do not invent words or phrases that are not in the sources");
  });

  it("MULTIPLE_CHOICE prompt does NOT include translation vocabulary constraint", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", baseParams);
    expect(prompt).not.toContain(
      "source and target text for each translation MUST come from actual vocabulary"
    );
  });

  it("FILL_IN_BLANK prompt does NOT include translation vocabulary constraint", () => {
    const prompt = buildQuizPrompt("FILL_IN_BLANK", baseParams);
    expect(prompt).not.toContain(
      "source and target text for each translation MUST come from actual vocabulary"
    );
  });

  // ── No RAG block when ragContext is not provided ──

  it("does not include RAG block when ragContext is undefined", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "beginner",
      count: 5,
    });
    expect(prompt).not.toContain("COURSE CONTENT");
    expect(prompt).not.toContain("Do not use general knowledge");
  });

  it("does not include RAG block when ragContext is empty string", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "beginner",
      count: 5,
      ragContext: "",
    });
    expect(prompt).not.toContain("COURSE CONTENT");
    expect(prompt).not.toContain("Do not use general knowledge");
  });

  it("TRANSLATION prompt omits vocabulary constraint without ragContext", () => {
    const prompt = buildQuizPrompt("TRANSLATION", {
      topic: "food",
      difficulty: "advanced",
      count: 5,
    });
    expect(prompt).not.toContain(
      "source and target text for each translation MUST come from actual vocabulary"
    );
  });

  // ── RAG + learningContext coexistence ──

  it("includes both RAG and learningContext blocks when both provided", () => {
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "beginner",
      count: 5,
      ragContext: sampleRag,
      learningContext: {
        completedTopics: ["Hello"],
        weakTopics: ["Colours"],
        strongTopics: [],
        frequentlyMissedWords: [],
        overallLevel: "beginner",
      },
    });
    // RAG block present
    expect(prompt).toContain("COURSE CONTENT");
    expect(prompt).toContain("Source 1");
    // Learning context block present
    expect(prompt).toContain("PERSONALISATION");
    expect(prompt).toContain("Hello");
    expect(prompt).toContain("STRUGGLE");
  });
});
