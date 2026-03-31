import { describe, it, expect } from "vitest";
import {
  requireString,
  normaliseMultipleChoice,
  normaliseFillInBlank,
  normaliseTranslation,
  parseGeminiQuizResponse,
  quizTypeToDbType,
  dbTypeToQuizType,
} from "./quiz-normalise";

// ═══════════════════════════════════════════════════════════════════════
// requireString
// ═══════════════════════════════════════════════════════════════════════

describe("requireString", () => {
  it("returns trimmed string for valid input", () => {
    expect(requireString("  hello  ", "test")).toBe("hello");
  });

  it("returns the string unchanged if already trimmed", () => {
    expect(requireString("hello", "test")).toBe("hello");
  });

  it("throws for empty string", () => {
    expect(() => requireString("", "myField")).toThrow(/non-empty string/);
  });

  it("throws for whitespace-only string", () => {
    expect(() => requireString("   ", "myField")).toThrow(/non-empty string/);
  });

  it("throws for null", () => {
    expect(() => requireString(null, "myField")).toThrow(/non-empty string/);
  });

  it("throws for undefined", () => {
    expect(() => requireString(undefined, "myField")).toThrow(/non-empty string/);
  });

  it("throws for number", () => {
    expect(() => requireString(42, "myField")).toThrow(/non-empty string/);
  });

  it("throws for boolean", () => {
    expect(() => requireString(true, "myField")).toThrow(/non-empty string/);
  });

  it("includes field label in error message", () => {
    expect(() => requireString(null, "explanation")).toThrow(/"explanation"/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Type mapping constants
// ═══════════════════════════════════════════════════════════════════════

describe("quizTypeToDbType", () => {
  it("maps MULTIPLE_CHOICE to mcq", () => {
    expect(quizTypeToDbType.get("MULTIPLE_CHOICE")).toBe("mcq");
  });

  it("maps FILL_IN_BLANK to fill_blank", () => {
    expect(quizTypeToDbType.get("FILL_IN_BLANK")).toBe("fill_blank");
  });

  it("maps TRANSLATION to translation", () => {
    expect(quizTypeToDbType.get("TRANSLATION")).toBe("translation");
  });
});

describe("dbTypeToQuizType", () => {
  it("maps mcq to MULTIPLE_CHOICE", () => {
    expect(dbTypeToQuizType.get("mcq")).toBe("MULTIPLE_CHOICE");
  });

  it("maps fill_blank to FILL_IN_BLANK", () => {
    expect(dbTypeToQuizType.get("fill_blank")).toBe("FILL_IN_BLANK");
  });

  it("maps translation to TRANSLATION", () => {
    expect(dbTypeToQuizType.get("translation")).toBe("TRANSLATION");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// normaliseMultipleChoice
// ═══════════════════════════════════════════════════════════════════════

describe("normaliseMultipleChoice", () => {
  const validMcq = {
    question: "What does 'ආයුබෝවන්' mean?",
    explanation: "It is the Sinhala greeting meaning 'Hello'.",
    options: [
      { text: "Hello", isCorrect: true },
      { text: "Goodbye", isCorrect: false },
      { text: "Thanks", isCorrect: false },
      { text: "Sorry", isCorrect: false },
    ],
  };

  it("parses valid MCQ and returns correct structure", () => {
    const result = normaliseMultipleChoice(validMcq);
    expect(result.question).toBe("What does 'ආයුබෝවන්' mean?");
    expect(result.correctAnswer).toBe("Hello");
    expect(result.explanation).toBe("It is the Sinhala greeting meaning 'Hello'.");
    expect(result.options).toHaveLength(4);
  });

  it("trims whitespace from question and explanation", () => {
    const result = normaliseMultipleChoice({
      ...validMcq,
      question: "  Trimmed question  ",
      explanation: "  Trimmed explanation  ",
    });
    expect(result.question).toBe("Trimmed question");
    expect(result.explanation).toBe("Trimmed explanation");
  });

  it("throws if options is not an array", () => {
    expect(() => normaliseMultipleChoice({ ...validMcq, options: "not an array" })).toThrow(
      /must be an array/
    );
  });

  it("throws if options is null", () => {
    expect(() => normaliseMultipleChoice({ ...validMcq, options: null })).toThrow(
      /must be an array/
    );
  });

  it("throws if not exactly 4 options", () => {
    expect(() =>
      normaliseMultipleChoice({
        ...validMcq,
        options: [{ text: "A", isCorrect: true }],
      })
    ).toThrow(/expected 4 options/);
  });

  it("throws if option is not an object", () => {
    expect(() =>
      normaliseMultipleChoice({
        ...validMcq,
        options: ["A", "B", "C", "D"],
      })
    ).toThrow(/not an object/);
  });

  it("throws if option.isCorrect is not a boolean", () => {
    expect(() =>
      normaliseMultipleChoice({
        ...validMcq,
        options: [
          { text: "A", isCorrect: "yes" },
          { text: "B", isCorrect: false },
          { text: "C", isCorrect: false },
          { text: "D", isCorrect: false },
        ],
      })
    ).toThrow(/must be a boolean/);
  });

  it("throws if no correct option exists", () => {
    const allWrong = validMcq.options.map((o) => ({ ...o, isCorrect: false }));
    expect(() => normaliseMultipleChoice({ ...validMcq, options: allWrong })).toThrow(
      /exactly 1 correct option/
    );
  });

  it("throws if multiple correct options exist", () => {
    const multipleCorrect = validMcq.options.map((o) => ({ ...o, isCorrect: true }));
    expect(() => normaliseMultipleChoice({ ...validMcq, options: multipleCorrect })).toThrow(
      /exactly 1 correct option/
    );
  });

  it("throws if question is missing", () => {
    expect(() => normaliseMultipleChoice({ ...validMcq, question: "" })).toThrow(
      /non-empty string/
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// normaliseFillInBlank
// ═══════════════════════════════════════════════════════════════════════

describe("normaliseFillInBlank", () => {
  const validFillBlank = {
    sentence: "මම ___ යනවා.",
    answer: "පාසලට",
    hint: "A place where students go",
    explanation: "'පාසලට' means 'to school'.",
  };

  it("parses valid fill-in-blank correctly", () => {
    const result = normaliseFillInBlank(validFillBlank);
    expect(result.question).toBe("මම ___ යනවා.");
    expect(result.correctAnswer).toBe("පාසලට");
    expect(result.explanation).toBe("'පාසලට' means 'to school'.");
    expect(result.options).toEqual({ hint: "A place where students go" });
  });

  it("sets hint to empty string if not provided", () => {
    const { hint: _, ...noHint } = validFillBlank;
    const result = normaliseFillInBlank(noHint);
    expect(result.options).toEqual({ hint: "" });
  });

  it("sets hint to empty string if hint is not a string", () => {
    const result = normaliseFillInBlank({ ...validFillBlank, hint: 42 });
    expect(result.options).toEqual({ hint: "" });
  });

  it("throws if sentence is missing", () => {
    expect(() => normaliseFillInBlank({ ...validFillBlank, sentence: "" })).toThrow(
      /non-empty string/
    );
  });

  it("throws if answer is missing", () => {
    expect(() => normaliseFillInBlank({ ...validFillBlank, answer: "" })).toThrow(
      /non-empty string/
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// normaliseTranslation
// ═══════════════════════════════════════════════════════════════════════

describe("normaliseTranslation", () => {
  const validTranslation = {
    sourceText: "ආයුබෝවන්",
    correctTranslation: "Hello",
    explanation: "'ආයුබෝවන්' means 'Hello'.",
    sourceLanguage: "sinhala",
    acceptableAlternatives: ["Greetings", "Welcome"],
  };

  it("parses valid translation correctly", () => {
    const result = normaliseTranslation(validTranslation);
    expect(result.question).toBe("ආයුබෝවන්");
    expect(result.correctAnswer).toBe("Hello");
    expect(result.explanation).toBe("'ආයුබෝවන්' means 'Hello'.");
    expect(result.options).toEqual({
      sourceLanguage: "sinhala",
      acceptableAlternatives: ["Greetings", "Welcome"],
    });
  });

  it("defaults acceptableAlternatives to empty array if not an array", () => {
    const result = normaliseTranslation({
      ...validTranslation,
      acceptableAlternatives: "not an array",
    });
    expect((result.options as { acceptableAlternatives: string[] }).acceptableAlternatives).toEqual(
      []
    );
  });

  it("defaults acceptableAlternatives to empty array if missing", () => {
    const { acceptableAlternatives: _, ...noAlts } = validTranslation;
    const result = normaliseTranslation(noAlts);
    expect((result.options as { acceptableAlternatives: string[] }).acceptableAlternatives).toEqual(
      []
    );
  });

  it("throws if sourceText is missing", () => {
    expect(() => normaliseTranslation({ ...validTranslation, sourceText: "" })).toThrow(
      /non-empty string/
    );
  });

  it("throws if correctTranslation is missing", () => {
    expect(() => normaliseTranslation({ ...validTranslation, correctTranslation: "" })).toThrow(
      /non-empty string/
    );
  });

  it("throws if sourceLanguage is missing", () => {
    expect(() => normaliseTranslation({ ...validTranslation, sourceLanguage: "" })).toThrow(
      /non-empty string/
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// parseGeminiQuizResponse
// ═══════════════════════════════════════════════════════════════════════

describe("parseGeminiQuizResponse", () => {
  const validMcqJson = JSON.stringify([
    {
      question: "What is 'cat' in Sinhala?",
      explanation: "පූසා means cat.",
      options: [
        { text: "පූසා", isCorrect: true },
        { text: "බල්ලා", isCorrect: false },
        { text: "කුකුළා", isCorrect: false },
        { text: "මීයා", isCorrect: false },
      ],
    },
  ]);

  it("parses clean JSON", () => {
    const result = parseGeminiQuizResponse(validMcqJson, "MULTIPLE_CHOICE");
    expect(result).toHaveLength(1);
    expect(result[0].correctAnswer).toBe("පූසා");
  });

  it("strips ```json markdown fences", () => {
    const wrapped = "```json\n" + validMcqJson + "\n```";
    const result = parseGeminiQuizResponse(wrapped, "MULTIPLE_CHOICE");
    expect(result).toHaveLength(1);
  });

  it("strips ``` markdown fences without json label", () => {
    const wrapped = "```\n" + validMcqJson + "\n```";
    const result = parseGeminiQuizResponse(wrapped, "MULTIPLE_CHOICE");
    expect(result).toHaveLength(1);
  });

  it("throws on non-array JSON (object)", () => {
    expect(() => parseGeminiQuizResponse('{"not": "an array"}', "MULTIPLE_CHOICE")).toThrow(
      /not a JSON array/
    );
  });

  it("throws on invalid JSON", () => {
    expect(() => parseGeminiQuizResponse("this is not json", "MULTIPLE_CHOICE")).toThrow();
  });

  it("throws on empty string", () => {
    expect(() => parseGeminiQuizResponse("", "MULTIPLE_CHOICE")).toThrow();
  });

  it("throws if array item is not an object", () => {
    expect(() => parseGeminiQuizResponse('["not an object"]', "MULTIPLE_CHOICE")).toThrow(
      /not an object/
    );
  });

  it("throws if array item is null", () => {
    expect(() => parseGeminiQuizResponse("[null]", "MULTIPLE_CHOICE")).toThrow(/not an object/);
  });

  it("parses fill-in-blank type", () => {
    const fillBlankJson = JSON.stringify([
      {
        sentence: "මම ___ යනවා.",
        answer: "පාසලට",
        hint: "school",
        explanation: "Means 'to school'.",
      },
    ]);
    const result = parseGeminiQuizResponse(fillBlankJson, "FILL_IN_BLANK");
    expect(result).toHaveLength(1);
    expect(result[0].correctAnswer).toBe("පාසලට");
  });

  it("parses translation type", () => {
    const translationJson = JSON.stringify([
      {
        sourceText: "Hello",
        sourceLanguage: "english",
        correctTranslation: "ආයුබෝවන්",
        acceptableAlternatives: [],
        explanation: "Standard greeting.",
      },
    ]);
    const result = parseGeminiQuizResponse(translationJson, "TRANSLATION");
    expect(result).toHaveLength(1);
    expect(result[0].correctAnswer).toBe("ආයුබෝවන්");
  });

  it("throws for unknown quiz type", () => {
    expect(() => parseGeminiQuizResponse('[{"q": "test"}]', "UNKNOWN" as never)).toThrow(
      /No normaliser found/
    );
  });
});
