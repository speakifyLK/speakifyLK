import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";

import db from "@/db/drizzle";
import { getUserLearningProfile, getUserProgress } from "@/db/queries";
import { aiQuizQuestions, aiQuizSessions } from "@/db/schema";
import { generateContent } from "@/lib/gemini";
import {
  buildQuizPrompt,
  type Difficulty,
  type LearningContext,
  type QuizType,
} from "@/lib/quiz-prompt";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_QUESTION_COUNT = 5;
const MAX_QUESTION_COUNT = 15;
const MAX_RETRIES = 2;

/** Allowed values for the questionTypes body field */
const VALID_QUESTION_TYPES = new Set<string>([
  "mcq",
  "fill_blank",
  "translation",
]);

/** Map request-level type names to internal QuizType */
const dbTypeToQuizType = new Map<string, QuizType>([
  ["mcq", "MULTIPLE_CHOICE"],
  ["fill_blank", "FILL_IN_BLANK"],
  ["translation", "TRANSLATION"],
]);

/** Map internal QuizType back to DB enum values */
const quizTypeToDbType = new Map<string, "mcq" | "fill_blank" | "translation">([
  ["MULTIPLE_CHOICE", "mcq"],
  ["FILL_IN_BLANK", "fill_blank"],
  ["TRANSLATION", "translation"],
]);

const VALID_DIFFICULTIES = new Set<string>([
  "beginner",
  "intermediate",
  "advanced",
]);

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

interface ValidatedBody {
  topic: string;
  difficulty: Difficulty;
  questionCount: number;
  questionTypes: QuizType[];
}

function validateRequestBody(body: unknown): ValidatedBody {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object.");
  }

  const { topic, difficulty, questionCount, questionTypes } = body as Record<
    string,
    unknown
  >;

  // topic
  if (typeof topic !== "string" || topic.trim().length === 0) {
    throw new Error('"topic" is required and must be a non-empty string.');
  }

  // difficulty
  if (typeof difficulty !== "string" || !VALID_DIFFICULTIES.has(difficulty)) {
    throw new Error(
      `"difficulty" must be one of: ${[...VALID_DIFFICULTIES].join(", ")}.`
    );
  }

  // questionCount
  if (
    typeof questionCount !== "number" ||
    !Number.isInteger(questionCount) ||
    questionCount < MIN_QUESTION_COUNT ||
    questionCount > MAX_QUESTION_COUNT
  ) {
    throw new Error(
      `"questionCount" must be an integer between ${MIN_QUESTION_COUNT} and ${MAX_QUESTION_COUNT}.`
    );
  }

  // questionTypes
  if (!Array.isArray(questionTypes) || questionTypes.length === 0) {
    throw new Error(
      '"questionTypes" must be a non-empty array of question type strings.'
    );
  }

  const mapped: QuizType[] = [];
  for (const qt of questionTypes) {
    if (typeof qt !== "string" || !VALID_QUESTION_TYPES.has(qt)) {
      throw new Error(
        `Invalid question type "${qt}". Allowed values: ${[...VALID_QUESTION_TYPES].join(", ")}.`
      );
    }
    const internal = dbTypeToQuizType.get(qt);
    if (internal && !mapped.includes(internal)) {
      mapped.push(internal);
    }
  }

  return {
    topic: topic.trim(),
    difficulty: difficulty as Difficulty,
    questionCount,
    questionTypes: mapped,
  };
}

// ---------------------------------------------------------------------------
// Gemini response parsing helpers
// ---------------------------------------------------------------------------

/** Assert a field is a non-empty string. */
function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `Invalid AI response: "${label}" must be a non-empty string.`
    );
  }
  return value.trim();
}

interface ParsedQuestion {
  question: string;
  correctAnswer: string;
  options?: unknown;
  explanation: string;
}

function normaliseMultipleChoice(
  raw: Record<string, unknown>
): ParsedQuestion {
  const question = requireString(raw.question, "question");
  const explanation = requireString(raw.explanation, "explanation");

  if (!Array.isArray(raw.options)) {
    throw new Error('Invalid AI response: "options" must be an array.');
  }
  if (raw.options.length !== 4) {
    throw new Error(
      `Invalid AI response: expected 4 options, received ${raw.options.length}.`
    );
  }

  const options = raw.options.map((o: unknown, i: number) => {
    if (o === null || typeof o !== "object") {
      throw new Error(
        `Invalid AI response: option at index ${i} is not an object.`
      );
    }
    const opt = o as { text?: unknown; isCorrect?: unknown };
    const text = requireString(opt.text, `options[${i}].text`);
    if (typeof opt.isCorrect !== "boolean") {
      throw new Error(
        `Invalid AI response: options[${i}].isCorrect must be a boolean.`
      );
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

function normaliseFillInBlank(
  raw: Record<string, unknown>
): ParsedQuestion {
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

function normaliseTranslation(
  raw: Record<string, unknown>
): ParsedQuestion {
  const question = requireString(raw.sourceText, "sourceText");
  const correctAnswer = requireString(
    raw.correctTranslation,
    "correctTranslation"
  );
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

const normalisers = new Map<
  QuizType,
  (raw: Record<string, unknown>) => ParsedQuestion
>([
  ["MULTIPLE_CHOICE", normaliseMultipleChoice],
  ["FILL_IN_BLANK", normaliseFillInBlank],
  ["TRANSLATION", normaliseTranslation],
]);

// ---------------------------------------------------------------------------
// Gemini call with retry logic
// ---------------------------------------------------------------------------

/**
 * Calls Gemini and parses the JSON response.
 * Retries up to `MAX_RETRIES` times **only** if the response is malformed
 * JSON or fails validation. Network / API errors are thrown immediately.
 */
async function callGeminiWithRetry(
  prompt: string,
  quizType: QuizType
): Promise<ParsedQuestion[]> {
  let lastParseError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // ── Call Gemini (NOT retried – network / API errors propagate) ──
    const geminiResponse = await generateContent(prompt);
    const responseText = geminiResponse.text ?? "";

    // ── Parse & validate (retried on failure) ──
    try {
      // Strip potential markdown fences
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
          throw new Error(
            `Gemini response item at index ${idx} is not an object.`
          );
        }
        return normalise(item as Record<string, unknown>);
      });
    } catch (err) {
      lastParseError = err instanceof Error ? err : new Error(String(err));
      // Retry only if we have attempts remaining
      if (attempt < MAX_RETRIES) {
        continue;
      }
    }
  }

  throw new Error(
    `Failed to get valid response from AI after ${MAX_RETRIES + 1} attempts. Last error: ${lastParseError?.message}`
  );
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // ── 1. Authenticate ──
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // ── 2. Parse & validate request body ──
  let body: ValidatedBody;
  try {
    const rawBody: unknown = await request.json();
    body = validateRequestBody(rawBody);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request body.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // ── 3. Get user progress & learning context ──
  const userProgress = await getUserProgress();
  if (!userProgress?.activeCourseId) {
    return NextResponse.json(
      { error: "No active course found. Please select a course first." },
      { status: 400 }
    );
  }

  const profile = await getUserLearningProfile();
  let learningContext: LearningContext | undefined;
  if (profile) {
    learningContext = {
      completedTopics: profile.completedLessons,
      weakTopics: profile.weakTopics,
      strongTopics: profile.strongTopics,
      frequentlyMissedWords: profile.frequentlyMissedWords,
      overallLevel: profile.overallLevel,
    };
  }

  // ── 4. Generate questions for each requested type ──
  // Distribute questionCount across question types as evenly as possible
  const typeCount = body.questionTypes.length;
  const basePerType = Math.floor(body.questionCount / typeCount);
  const remainder = body.questionCount % typeCount;

  const allQuestions: (ParsedQuestion & { type: QuizType })[] = [];

  try {
    for (let i = 0; i < body.questionTypes.length; i++) {
      const quizType = body.questionTypes[i];
      const count = basePerType + (i < remainder ? 1 : 0);

      if (count === 0) continue;

      const prompt = buildQuizPrompt(quizType, {
        topic: body.topic,
        difficulty: body.difficulty,
        count,
        learningContext,
      });

      const questions = await callGeminiWithRetry(prompt, quizType);
      allQuestions.push(...questions.map((q) => ({ ...q, type: quizType })));
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate quiz.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (allQuestions.length === 0) {
    return NextResponse.json(
      { error: "No questions were generated." },
      { status: 502 }
    );
  }

  // ── 5. Save session to database ──
  const [session] = await db
    .insert(aiQuizSessions)
    .values({
      userId,
      topic: body.topic,
      difficulty: body.difficulty,
      totalQuestions: allQuestions.length,
      courseId: userProgress.activeCourseId,
    })
    .returning({ id: aiQuizSessions.id });

  await db.insert(aiQuizQuestions).values(
    allQuestions.map((q, idx) => ({
      sessionId: session.id,
      type: quizTypeToDbType.get(q.type) ?? "mcq",
      question: q.question,
      options: q.options ?? null,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      order: idx + 1,
    }))
  );

  // ── 6. Return response ──
  return NextResponse.json({
    sessionId: session.id,
    questions: allQuestions.map((q, idx) => ({
      id: idx + 1,
      type: quizTypeToDbType.get(q.type),
      question: q.question,
      correctAnswer: q.correctAnswer,
      options: q.options,
      explanation: q.explanation,
    })),
  });
}
