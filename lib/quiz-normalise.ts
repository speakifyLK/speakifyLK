import type { QuizType } from "@/lib/quiz-prompt";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface ParsedQuestion {
  question: string;
  correctAnswer: string;
  options?: unknown;
  explanation: string;
}

/** Map internal QuizType to DB enum value */
export const quizTypeToDbType = new Map<QuizType, "mcq" | "fill_blank" | "translation">([
  ["MULTIPLE_CHOICE", "mcq"],
  ["FILL_IN_BLANK", "fill_blank"],
  ["TRANSLATION", "translation"],
]);

/** Map DB enum value to internal QuizType */
export const dbTypeToQuizType = new Map<string, QuizType>([
  ["mcq", "MULTIPLE_CHOICE"],
  ["fill_blank", "FILL_IN_BLANK"],
  ["translation", "TRANSLATION"],
]);

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Assert a field is a non-empty string, or throw with a clear message. */
export function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `Invalid AI response: "${label}" must be a non-empty string, received: ${JSON.stringify(value)}`
    );
  }
  return value.trim();
}

// ---------------------------------------------------------------------------
// Per-type normalisers
// ---------------------------------------------------------------------------

export function normaliseMultipleChoice(raw: Record<string, unknown>): ParsedQuestion {
  const question = requireString(raw.question, "question");
  const explanation = requireString(raw.explanation, "explanation");

  if (!Array.isArray(raw.options)) {
    throw new Error('Invalid AI response: "options" must be an array.');
  }
  if (raw.options.length !== 4) {
    throw new Error(`Invalid AI response: expected 4 options, received ${raw.options.length}.`);
  }

  const options = raw.options.map((o: unknown, i: number) => {
    if (o === null || typeof o !== "object") {
      throw new Error(`Invalid AI response: option at index ${i} is not an object.`);
    }
    const opt = o as { text?: unknown; isCorrect?: unknown };
    const text = requireString(opt.text, `options[${i}].text`);
    if (typeof opt.isCorrect !== "boolean") {
      throw new Error(`Invalid AI response: options[${i}].isCorrect must be a boolean.`);
    }
    return { text, isCorrect: opt.isCorrect };
  });

  const correctOptions = options.filter((o) => o.isCorrect);
  if (correctOptions.length !== 1) {
    throw new Error(
      `Invalid AI response: expected exactly 1 correct option, found ${correctOptions.length}.`
    );
  }

  return {
    question,
    correctAnswer: correctOptions[0].text,
    options,
    explanation,
  };
}

export function normaliseFillInBlank(raw: Record<string, unknown>): ParsedQuestion {
  const question = requireString(raw.sentence, "sentence");
  const correctAnswer = requireString(raw.answer, "answer");
  const explanation = requireString(raw.explanation, "explanation");

  return {
    question,
    correctAnswer,
    options: { hint: typeof raw.hint === "string" ? raw.hint.trim() : "" },
    explanation,
  };
}

export function normaliseTranslation(raw: Record<string, unknown>): ParsedQuestion {
  const question = requireString(raw.sourceText, "sourceText");
  const correctAnswer = requireString(raw.correctTranslation, "correctTranslation");
  const explanation = requireString(raw.explanation, "explanation");
  requireString(raw.sourceLanguage, "sourceLanguage");

  return {
    question,
    correctAnswer,
    options: {
      sourceLanguage: raw.sourceLanguage,
      acceptableAlternatives: Array.isArray(raw.acceptableAlternatives)
        ? raw.acceptableAlternatives
        : [],
    },
    explanation,
  };
}

// ---------------------------------------------------------------------------
// Normaliser registry (Map for safe dynamic dispatch – CodeQL compliant)
// ---------------------------------------------------------------------------

export const normalisers = new Map<QuizType, (raw: Record<string, unknown>) => ParsedQuestion>([
  ["MULTIPLE_CHOICE", normaliseMultipleChoice],
  ["FILL_IN_BLANK", normaliseFillInBlank],
  ["TRANSLATION", normaliseTranslation],
]);

/**
 * Parse raw Gemini JSON text into validated ParsedQuestion[].
 * Strips markdown fences, validates array structure, and normalises
 * each item according to the given quiz type.
 */
export function parseGeminiQuizResponse(
  responseText: string,
  quizType: QuizType
): ParsedQuestion[] {
  const cleaned = responseText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const parsed = JSON.parse(cleaned) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response is not a JSON array.");
  }

  if (!normalisers.has(quizType)) {
    throw new Error(`No normaliser found for quiz type "${quizType}".`);
  }
  const normalise = normalisers.get(quizType)!;

  return parsed.map((item: unknown, idx: number) => {
    if (item === null || typeof item !== "object") {
      throw new Error(`Gemini response item at index ${idx} is not an object.`);
    }
    return normalise(item as Record<string, unknown>);
  });
}
