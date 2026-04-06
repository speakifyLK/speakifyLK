"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import db from "@/db/drizzle";
import { getUserProgress } from "@/db/queries";
import { aiQuizQuestions, aiQuizSessions, userProgress } from "@/db/schema";
import { generateContent } from "@/lib/gemini";

type QuizDifficulty = (typeof aiQuizSessions.$inferSelect)["difficulty"];

function calculateQuizCompletionXp(
  correctAnswers: number,
  totalQuestions: number,
  difficulty: QuizDifficulty
): number {
  const baseXp = 10;
  const correctXp = correctAnswers * 2;
  const difficultyBonus = difficulty === "intermediate" ? 5 : difficulty === "advanced" ? 10 : 0;
  const perfectBonus = totalQuestions > 0 && correctAnswers === totalQuestions ? 20 : 0;
  return baseXp + correctXp + difficultyBonus + perfectBonus;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Normalizes a string for comparison: trim, lowercase, remove extra spaces and punctuation
 */
function normalizeString(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, "") // Remove punctuation and symbols (Unicode-aware)
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim();
}

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a matrix
  const matrix: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculates a dynamic Levenshtein distance threshold based on string length.
 * Uses 25% of the string length, with a minimum of 1 and maximum of 3.
 * This prevents overly lenient matching for short strings while allowing
 * reasonable tolerance for typos in longer strings.
 */
function getLevenshteinThreshold(str: string): number {
  const length = str.length;
  if (length === 0) return 0;
  // Use 25% of length, minimum 1, maximum 3
  return Math.max(1, Math.min(3, Math.floor(length * 0.25)));
}

/**
 * Checks if user answer matches correct answer or any acceptable alternative
 * using fuzzy matching for FILL_IN_BLANK and TRANSLATION types.
 * Returns { isCorrect, usedAi } so the caller knows whether AI was consulted.
 */
function isAnswerCorrectLocal(
  userAnswer: string,
  correctAnswer: string,
  questionType: "mcq" | "fill_blank" | "translation",
  options: unknown
): boolean {
  // For MCQ, compare directly
  if (questionType === "mcq") {
    return normalizeString(userAnswer) === normalizeString(correctAnswer);
  }

  // For FILL_IN_BLANK and TRANSLATION, use fuzzy matching
  const normalizedUser = normalizeString(userAnswer);
  const normalizedCorrect = normalizeString(correctAnswer);

  // Check exact match after normalization
  if (normalizedUser === normalizedCorrect) {
    return true;
  }

  // Check against acceptable alternatives if they exist
  if (options && typeof options === "object" && "acceptableAlternatives" in options) {
    const alternatives = options.acceptableAlternatives;
    if (Array.isArray(alternatives)) {
      for (const alt of alternatives) {
        if (typeof alt === "string") {
          const normalizedAlt = normalizeString(alt);
          // Check exact match
          if (normalizedUser === normalizedAlt) {
            return true;
          }
          // Check Levenshtein distance with dynamic threshold
          const threshold = getLevenshteinThreshold(normalizedAlt);
          if (levenshteinDistance(normalizedUser, normalizedAlt) <= threshold) {
            return true;
          }
        }
      }
    }
  }

  // Check Levenshtein distance against correct answer with dynamic threshold
  const threshold = getLevenshteinThreshold(normalizedCorrect);
  if (levenshteinDistance(normalizedUser, normalizedCorrect) <= threshold) {
    return true;
  }

  return false;
}

/** Result from AI validation — includes an optional explanation for the student. */
type AiValidationResult = {
  isCorrect: boolean;
  explanation?: string;
} | null;

/**
 * Uses AI to determine if a user's answer is a linguistically valid response.
 * Instead of comparing the student's answer to a single expected answer, this
 * evaluates whether the answer is a grammatically and semantically valid
 * completion / translation for the given question. The expected answer is
 * provided only as one example of a correct response.
 * Returns { isCorrect, explanation? }, or null if the AI call fails.
 */
async function isAnswerCorrectAi(
  userAnswer: string,
  correctAnswer: string,
  question: string,
  questionType: "fill_blank" | "translation"
): Promise<AiValidationResult> {
  const typeLabel = questionType === "fill_blank" ? "fill-in-the-blank" : "translation";
  const prompt = `You are a Sinhala language expert validating a student's quiz answer.

Question type: ${typeLabel}
Question: ${question}
One example of a correct answer: ${correctAnswer}
Student's answer: ${userAnswer}

IMPORTANT: There are often MANY valid answers. For fill-in-the-blank questions, any word or phrase that creates a grammatically correct and meaningful Sinhala sentence is acceptable. For translation questions, any accurate translation is acceptable.

Do NOT limit correctness to just the example answer. Evaluate whether the student's answer is a linguistically valid and meaningful response to the question itself.

The student may answer in romanized form (e.g. "loku") instead of Sinhala script (e.g. "ලොකු"), or vice versa. Accept romanized equivalents and minor spelling variations.

Respond in EXACTLY this format (two lines):
CORRECT or INCORRECT
A brief one-sentence explanation of why the student's specific answer is correct or incorrect in the context of this question.`;

  try {
    const response = await generateContent(prompt, {
      temperature: 0,
      maxOutputTokens: 128,
    });
    const raw = (response.text ?? "").trim();
    const firstLine = raw.split("\n")[0].trim().toUpperCase();
    const explanation = raw.split("\n").slice(1).join(" ").trim() || undefined;

    if (firstLine.includes("CORRECT") && !firstLine.includes("INCORRECT")) {
      return { isCorrect: true, explanation };
    }
    if (firstLine.includes("INCORRECT")) {
      return { isCorrect: false, explanation };
    }
    // Unparseable response — treat as failure
    return null;
  } catch {
    return null;
  }
}

/** Result from answer validation — includes an optional AI explanation. */
type AnswerResult = {
  isCorrect: boolean;
  explanation?: string;
};

/**
 * Full answer validation.
 * - MCQ: local string match only (authoritative).
 * - fill_blank / translation: AI is the *primary* validator because there are
 *   often many linguistically valid answers beyond the single expected answer.
 *   If AI is unavailable, local fuzzy matching is used as a safety-net fallback.
 */
async function isAnswerCorrect(
  userAnswer: string,
  correctAnswer: string,
  questionType: "mcq" | "fill_blank" | "translation",
  question: string,
  options: unknown
): Promise<AnswerResult> {
  // For MCQ, local matching is authoritative — no AI needed
  if (questionType === "mcq") {
    return {
      isCorrect: isAnswerCorrectLocal(userAnswer, correctAnswer, questionType, options),
    };
  }

  // For fill_blank and translation, use AI as the primary validator
  const aiResult = await isAnswerCorrectAi(userAnswer, correctAnswer, question, questionType);

  // If AI returned a definitive answer, use it (with explanation)
  if (aiResult !== null) return aiResult;

  // AI failed — fall back to local fuzzy matching as safety net
  return {
    isCorrect: isAnswerCorrectLocal(userAnswer, correctAnswer, questionType, options),
  };
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Creates a new AI quiz session
 * @param topic - The quiz topic (e.g., "greetings", "verbs")
 * @param difficulty - Difficulty level: "beginner" | "intermediate" | "advanced"
 * @param courseId - The course ID
 * @param totalQuestions - The total number of questions in this quiz session
 * @returns The created session record
 */
export async function createQuizSession(
  topic: string,
  difficulty: "beginner" | "intermediate" | "advanced",
  courseId: number,
  totalQuestions: number
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");

  // Verify course exists and user has access
  const userProgressData = await getUserProgress();
  if (!userProgressData?.activeCourseId || userProgressData.activeCourseId !== courseId) {
    throw new Error("Invalid course or access denied.");
  }

  if (totalQuestions <= 0) {
    throw new Error("totalQuestions must be greater than 0.");
  }

  const [session] = await db
    .insert(aiQuizSessions)
    .values({
      userId,
      topic,
      difficulty,
      totalQuestions,
      courseId,
    })
    .returning();

  revalidatePath("/learn");
  return session;
}

/**
 * Submits a quiz answer and determines correctness
 * @param questionId - The ID of the question being answered
 * @param userAnswer - The user's answer text
 * @returns Object with isCorrect boolean and optional AI explanation
 */
export async function submitQuizAnswer(questionId: number, userAnswer: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");

  const normalizedUserAnswer = userAnswer?.trim();
  if (!normalizedUserAnswer) {
    throw new Error("Answer cannot be empty.");
  }
  // Fetch the question with its session
  const question = await db.query.aiQuizQuestions.findFirst({
    where: eq(aiQuizQuestions.id, questionId),
    with: {
      session: true,
    },
  });

  if (!question) {
    throw new Error("Question not found.");
  }

  // Verify session ownership
  if (question.session.userId !== userId) {
    throw new Error("Unauthorized.");
  }

  // Check if session is already completed
  if (question.session.completedAt) {
    throw new Error("Quiz session is already completed.");
  }

  // Determine correctness
  const answerResult = await isAnswerCorrect(
    userAnswer,
    question.correctAnswer,
    question.type,
    question.question,
    question.options
  );

  const { isCorrect, explanation: aiExplanation } = answerResult;

  // Track if this is the first time marking as correct
  const wasPreviouslyCorrect = question.isCorrect === true;
  const isNowCorrect = isCorrect;

  // Update the question with user answer and correctness
  await db
    .update(aiQuizQuestions)
    .set({
      userAnswer,
      isCorrect,
    })
    .where(eq(aiQuizQuestions.id, questionId));

  // Update correctAnswers count in session
  // Only increment if this is newly correct (wasn't correct before)
  // Only decrement if this was correct before but is now incorrect
  if (isNowCorrect && !wasPreviouslyCorrect) {
    // Newly correct - increment
    await db
      .update(aiQuizSessions)
      .set({
        correctAnswers: question.session.correctAnswers + 1,
      })
      .where(eq(aiQuizSessions.id, question.sessionId));
  } else if (!isNowCorrect && wasPreviouslyCorrect) {
    // Was correct but now incorrect - decrement
    await db
      .update(aiQuizSessions)
      .set({
        correctAnswers: Math.max(0, question.session.correctAnswers - 1),
      })
      .where(eq(aiQuizSessions.id, question.sessionId));
  }

  revalidatePath("/learn");
  revalidatePath("/quiz");

  return { isCorrect, aiExplanation };
}

export type CompleteQuizSessionResult = {
  session: typeof aiQuizSessions.$inferSelect;
  xpAwarded: number;
};

/**
 * Completes a quiz session, calculates final score, and awards XP.
 * Safe to call more than once: already-completed sessions are returned without re-awarding XP.
 */
export async function completeQuizSession(sessionId: number): Promise<CompleteQuizSessionResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");

  // Fetch the session
  const session = await db.query.aiQuizSessions.findFirst({
    where: and(eq(aiQuizSessions.id, sessionId), eq(aiQuizSessions.userId, userId)),
  });

  if (!session) {
    throw new Error("Session not found or unauthorized.");
  }

  if (session.completedAt) {
    return { session, xpAwarded: 0 };
  }

  const xpAwarded = calculateQuizCompletionXp(
    session.correctAnswers,
    session.totalQuestions,
    session.difficulty
  );

  // Calculate final score percentage
  const scorePercentage =
    session.totalQuestions > 0
      ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
      : 0;

  // Neon HTTP driver does not support db.transaction(); use two statements.
  // Session completion uses a conditional update so only one caller wins races.
  const [completedSession] = await db
    .update(aiQuizSessions)
    .set({
      score: scorePercentage,
      completedAt: new Date(),
    })
    .where(and(eq(aiQuizSessions.id, sessionId), isNull(aiQuizSessions.completedAt)))
    .returning();

  let result: CompleteQuizSessionResult;

  if (!completedSession) {
    const existing = await db.query.aiQuizSessions.findFirst({
      where: and(eq(aiQuizSessions.id, sessionId), eq(aiQuizSessions.userId, userId)),
    });
    if (!existing) {
      throw new Error("Session not found or unauthorized.");
    }
    result = { session: existing, xpAwarded: 0 };
  } else {
    // SQL increment avoids lost updates when points change concurrently (e.g. challenges, shop).
    await db
      .insert(userProgress)
      .values({
        userId,
        activeCourseId: session.courseId,
        points: xpAwarded,
      })
      .onConflictDoUpdate({
        target: userProgress.userId,
        set: {
          points: sql`${userProgress.points} + ${xpAwarded}`,
        },
      });

    result = { session: completedSession, xpAwarded };
  }

  revalidatePath("/learn");
  revalidatePath("/quiz");
  revalidatePath("/quests");
  revalidatePath("/leaderboard");

  return result;
}
