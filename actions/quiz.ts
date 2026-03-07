"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import db from "@/db/drizzle";
import { getUserProgress } from "@/db/queries";
import { aiQuizQuestions, aiQuizSessions, userProgress } from "@/db/schema";

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
 * using fuzzy matching for FILL_IN_BLANK and TRANSLATION types
 */
function isAnswerCorrect(
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
 * @returns Object with isCorrect boolean
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
  const isCorrect = isAnswerCorrect(
    userAnswer,
    question.correctAnswer,
    question.type,
    question.options
  );

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
  return { isCorrect };
}

/**
 * Completes a quiz session, calculates final score, and awards XP
 * @param sessionId - The ID of the session to complete
 * @returns The completed session record
 */
export async function completeQuizSession(sessionId: number) {
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
    throw new Error("Session is already completed.");
  }

  // Calculate final score percentage
  const scorePercentage =
    session.totalQuestions > 0
      ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
      : 0;

  // Update session with score and completedAt
  const [completedSession] = await db
    .update(aiQuizSessions)
    .set({
      score: scorePercentage,
      completedAt: new Date(),
    })
    .where(eq(aiQuizSessions.id, sessionId))
    .returning();

  // Award XP points based on score
  // Base XP: 10 points per correct answer
  // Bonus: +50 points for perfect score (100%)
  const baseXP = session.correctAnswers * 10;
  const bonusXP = scorePercentage === 100 ? 50 : 0;
  const totalXP = baseXP + bonusXP;

  // Update user progress with XP
  const currentUserProgress = await getUserProgress();
  if (currentUserProgress) {
    await db
      .update(userProgress)
      .set({
        points: currentUserProgress.points + totalXP,
      })
      .where(eq(userProgress.userId, userId));
  }

  revalidatePath("/learn");
  revalidatePath("/quests");
  revalidatePath("/leaderboard");

  return completedSession;
}
