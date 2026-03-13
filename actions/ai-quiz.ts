"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { getUserLearningProfile, getUserProgress } from "@/db/queries";
import { aiQuizQuestions, aiQuizSessions } from "@/db/schema";
import { generateContent } from "@/lib/gemini";
import {
  parseGeminiQuizResponse,
  quizTypeToDbType,
  type ParsedQuestion,
} from "@/lib/quiz-normalise";
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

  const geminiResponse = await generateContent(prompt, { maxOutputTokens: 8192 });
  const responseText = geminiResponse.text ?? "";

  // ── 3. Parse & normalise questions (shared logic) ──
  const questions: ParsedQuestion[] = parseGeminiQuizResponse(responseText, input.type);

  // ── 4. Save session and questions to the database ──
  // Note: neon-http driver does not support transactions, so we use
  // sequential inserts.
  const [session] = await db
    .insert(aiQuizSessions)
    .values({
      userId,
      topic: input.topic,
      difficulty: input.difficulty,
      totalQuestions: questions.length,
      courseId: userProgress.activeCourseId!,
    })
    .returning({ id: aiQuizSessions.id });

  try {
    await db.insert(aiQuizQuestions).values(
      questions.map((q, idx) => ({
        sessionId: session.id,
        type: quizTypeToDbType.get(input.type) ?? "mcq",
        question: q.question,
        options: q.options ?? null,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        order: idx + 1,
      }))
    );
  } catch (error) {
    // Best-effort cleanup of the orphaned session
    await db
      .delete(aiQuizSessions)
      .where(eq(aiQuizSessions.id, session.id))
      .catch(() => {});
    throw error;
  }

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
