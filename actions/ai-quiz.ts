"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

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
// Types
// ---------------------------------------------------------------------------

interface GenerateQuizInput {
  /** Quiz topic – e.g. "greetings", "verbs" */
  topic: string;
  /** Question type */
  type: QuizType;
  /** Difficulty level */
  difficulty: Difficulty;
  /** How many questions to generate */
  count: number;
}

interface GeneratedQuestion {
  question: string;
  correctAnswer: string;
  options?: unknown;
  explanation: string;
}

// ---------------------------------------------------------------------------
// Helpers – validate & normalise Gemini's JSON into a uniform shape
// ---------------------------------------------------------------------------

/** Assert a field is a non-empty string, or throw with a clear message. */
function requireString(
  value: unknown,
  label: string
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `Invalid AI response: "${label}" must be a non-empty string, received: ${JSON.stringify(value)}`
    );
  }
  return value.trim();
}

function normaliseMultipleChoice(raw: Record<string, unknown>): GeneratedQuestion {
  const question = requireString(raw.question, "question");
  const explanation = requireString(raw.explanation, "explanation");

  if (!Array.isArray(raw.options)) {
    throw new Error(
      "Invalid AI response: \"options\" must be an array."
    );
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

function normaliseFillInBlank(raw: Record<string, unknown>): GeneratedQuestion {
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

function normaliseTranslation(raw: Record<string, unknown>): GeneratedQuestion {
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

const normalisers: Record<
  QuizType,
  (raw: Record<string, unknown>) => GeneratedQuestion
> = {
  MULTIPLE_CHOICE: normaliseMultipleChoice,
  FILL_IN_BLANK: normaliseFillInBlank,
  TRANSLATION: normaliseTranslation,
};

/** Map external QuizType to DB enum value */
const quizTypeToDbType: Record<QuizType, "mcq" | "fill_blank" | "translation"> = {
  MULTIPLE_CHOICE: "mcq",
  FILL_IN_BLANK: "fill_blank",
  TRANSLATION: "translation",
};

// ---------------------------------------------------------------------------
// Main server action
// ---------------------------------------------------------------------------

/**
 * Generate a personalised AI quiz for the current user.
 *
 * 1. Fetches the user's learning profile (across ALL units).
 * 2. Builds a context-aware prompt for Gemini.
 * 3. Calls Gemini and parses the response.
 * 4. Saves the session & questions to the database.
 * 5. Returns the session ID and generated questions.
 */
export async function generatePersonalizedQuiz(input: GenerateQuizInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");

  const userProgress = await getUserProgress();
  if (!userProgress?.activeCourseId) {
    throw new Error("No active course found. Please select a course first.");
  }

  // ── 1. Build learning context from the user's history ──
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

  // ── 2. Build prompt & call Gemini ──
  const prompt = buildQuizPrompt(input.type, {
    topic: input.topic,
    difficulty: input.difficulty,
    count: input.count,
    learningContext,
  });

  const geminiResponse = await generateContent(prompt);
  const responseText = geminiResponse.text ?? "";

  // Strip potential markdown fences
  const cleaned = responseText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  let parsed: Record<string, unknown>[];
  try {
    parsed = JSON.parse(cleaned) as Record<string, unknown>[];
  } catch {
    throw new Error(
      "Failed to parse Gemini response as JSON. The AI returned an unexpected format."
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response is not an array.");
  }

  // ── 3. Normalise questions ──
  const normalise = normalisers[input.type];
  const questions: GeneratedQuestion[] = parsed.map(normalise);

  // ── 4. Save to database ──
  const [session] = await db
    .insert(aiQuizSessions)
    .values({
      userId,
      topic: input.topic,
      difficulty: input.difficulty,
      totalQuestions: questions.length,
      courseId: userProgress.activeCourseId,
    })
    .returning({ id: aiQuizSessions.id });

  await db.insert(aiQuizQuestions).values(
    questions.map((q, idx) => ({
      sessionId: session.id,
      type: quizTypeToDbType[input.type],
      question: q.question,
      options: q.options ?? null,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      order: idx + 1,
    }))
  );

  revalidatePath("/learn");

  // ── 5. Return results ──
  return {
    sessionId: session.id,
    questions: questions.map((q, idx) => ({
      id: idx + 1,
      ...q,
    })),
  };
}
