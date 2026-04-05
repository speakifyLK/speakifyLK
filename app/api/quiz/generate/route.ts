import { NextResponse } from "next/server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { getUserLearningProfile, getUserProgress } from "@/db/queries";
import {
  aiQuizQuestions,
  aiQuizSessions,
  type AiQuizSessionMetadata,
} from "@/db/schema";
import { generateContent } from "@/lib/gemini";
import {
  dbTypeToQuizType,
  parseGeminiQuizResponse,
  quizTypeToDbType,
  type ParsedQuestion,
} from "@/lib/quiz-normalise";
import { formatQuizRagChunksForPrompt, getQuizContext } from "@/lib/quiz-rag";
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
const VALID_QUESTION_TYPES = new Set<string>(["mcq", "fill_blank", "translation"]);
const VALID_DIFFICULTIES = new Set<string>(["beginner", "intermediate", "advanced"]);

// ---------------------------------------------------------------------------
// Request body validation
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

  const { topic, difficulty, questionCount, questionTypes } = body as Record<string, unknown>;

  if (typeof topic !== "string" || topic.trim().length === 0) {
    throw new Error('"topic" is required and must be a non-empty string.');
  }

  if (typeof difficulty !== "string" || !VALID_DIFFICULTIES.has(difficulty)) {
    throw new Error(`"difficulty" must be one of: ${[...VALID_DIFFICULTIES].join(", ")}.`);
  }

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

  if (!Array.isArray(questionTypes) || questionTypes.length === 0) {
    throw new Error('"questionTypes" must be a non-empty array of question type strings.');
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
// Gemini call with retry logic
// ---------------------------------------------------------------------------

/**
 * Calls Gemini and parses the JSON response.
 * Retries up to `MAX_RETRIES` times **only** if the response is malformed
 * JSON or fails validation. Network / API errors are thrown immediately.
 */
async function callGeminiWithRetry(
  prompt: string,
  quizType: QuizType,
  expectedCount: number
): Promise<ParsedQuestion[]> {
  let lastParseError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // ── Call Gemini (NOT retried – network / API errors propagate) ──
    const geminiResponse = await generateContent(prompt, {
      maxOutputTokens: 8192,
    });
    const responseText = geminiResponse.text ?? "";

    // ── Parse & validate (retried on failure) ──
    try {
      const questions = parseGeminiQuizResponse(responseText, quizType);

      if (questions.length !== expectedCount) {
        throw new Error(
          `Expected ${expectedCount} questions but Gemini returned ${questions.length}.`
        );
      }

      return questions;
    } catch (err) {
      lastParseError = err instanceof Error ? err : new Error(String(err));
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
  try {
    // ── 1. Authenticate ──
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // ── 2. Parse & validate request body ──
    let rawBody: unknown;
    let body: ValidatedBody;
    try {
      rawBody = await request.json();
      body = validateRequestBody(rawBody);
    } catch (err) {
      /* v8 ignore next 2 */
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

    // Optional: lock generation to the same course as a previous session (Try Again)
    if (rawBody && typeof rawBody === "object" && "courseId" in rawBody) {
      const cid = (rawBody as Record<string, unknown>).courseId;
      if (cid !== undefined && cid !== null) {
        if (typeof cid !== "number" || !Number.isInteger(cid)) {
          return NextResponse.json({ error: "Invalid courseId." }, { status: 400 });
        }
        if (cid !== userProgress.activeCourseId) {
          return NextResponse.json(
            {
              error:
                "Switch to the course this quiz was created in, or start a new quiz from the setup screen.",
            },
            { status: 400 }
          );
        }
      }
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
    const typeCount = body.questionTypes.length;
    const basePerType = Math.floor(body.questionCount / typeCount);
    const remainder = body.questionCount % typeCount;

    const allQuestions: (ParsedQuestion & { type: QuizType })[] = [];
    let isRagGrounded = false; // Final flag for the DB session (true if any question was RAG grounded)
    let ragContextAvailable = true; // Flag to determine if we should still try RAG
    let sharedRagContext: string | undefined = undefined;
    /** Non-empty retrieved chunks (for prompt formatting and session metadata). */
    let ragChunksForMetadata: Awaited<ReturnType<typeof getQuizContext>> = [];

    // Fetch RAG context once for all question types
    try {
      const ragChunks = await getQuizContext(body.topic, body.difficulty);
      const validChunks = ragChunks.filter((c) => c.text && c.text.trim().length > 0);

      if (validChunks.length > 0) {
        ragChunksForMetadata = validChunks;
        sharedRagContext = formatQuizRagChunksForPrompt(validChunks);
      } else {
        ragContextAvailable = false;
        console.info(
          "[quiz/generate] No relevant RAG context found for this topic. Proceeding without context."
        );
      }
    } catch (err) {
      ragContextAvailable = false;
      console.warn("[quiz/generate] Error retrieving RAG context:", err);
    }

    for (let i = 0; i < body.questionTypes.length; i++) {
      const quizType = body.questionTypes[i];
      const count = basePerType + (i < remainder ? 1 : 0);

      // v8 ignore next
      if (count === 0) continue;

      let questions: ParsedQuestion[] = [];
      let isSuccessWithRag = false;

      // ── Try RAG-enhanced generation path ──
      if (ragContextAvailable && sharedRagContext) {
        try {
          const prompt = buildQuizPrompt(quizType, {
            topic: body.topic,
            difficulty: body.difficulty,
            count,
            learningContext,
            ragContext: sharedRagContext,
          });

          questions = await callGeminiWithRetry(prompt, quizType, count);
          isSuccessWithRag = true;
          isRagGrounded = true; // Mark that at least ONE type succeeded with RAG
        } catch (ragError) {
          console.warn(
            "[quiz/generate] RAG-enhanced generation failed for this type, reverting to original flow for the remainder of the request:",
            ragError
          );
          ragContextAvailable = false;
          sharedRagContext = undefined;
        }
      }

      // ── Fallback to original non-RAG flow ──
      if (!isSuccessWithRag) {
        // Build prompt — errors here are client input problems (400)
        let prompt: string;
        try {
          prompt = buildQuizPrompt(quizType, {
            topic: body.topic,
            difficulty: body.difficulty,
            count,
            learningContext,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Invalid quiz parameters.";
          return NextResponse.json({ error: message }, { status: 400 });
        }

        // Call Gemini — errors here are upstream failures (502)
        try {
          questions = await callGeminiWithRetry(prompt, quizType, count);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to generate quiz.";
          return NextResponse.json({ error: message }, { status: 502 });
        }
      }

      allQuestions.push(...questions.map((q) => ({ ...q, type: quizType })));
    }

    /* v8 ignore next 3 -- defensive guard; questionTypes is validated non-empty above */
    if (allQuestions.length === 0) {
      return NextResponse.json({ error: "No questions were generated." }, { status: 502 });
    }

    const sessionMetadata: AiQuizSessionMetadata | null =
      ragChunksForMetadata.length > 0
        ? {
            rag: {
              provider: "vertex_rag_retrieveContexts",
              chunkCount: ragChunksForMetadata.length,
              chunkSources: ragChunksForMetadata.map((c) => ({
                source: c.source,
                score: c.score,
              })),
              groundedGeneration: isRagGrounded,
            },
          }
        : null;

    // ── 5. Save session and questions to the database ──
    // Note: neon-http driver does not support transactions, so we use
    // sequential inserts. The session is created first, then questions
    // reference the session ID via a foreign key.
    const [session] = await db
      .insert(aiQuizSessions)
      .values({
        userId,
        topic: body.topic,
        difficulty: body.difficulty,
        totalQuestions: allQuestions.length,
        courseId: userProgress.activeCourseId!,
        ragGrounded: isRagGrounded,
        metadata: sessionMetadata,
      })
      .returning({ id: aiQuizSessions.id });

    try {
      /* v8 ignore start */
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
      /* v8 ignore stop */
    } catch (error) {
      await db
        .delete(aiQuizSessions)
        .where(eq(aiQuizSessions.id, session.id))
        .catch(() => {});
      throw error;
    }

    // ── 6. Return response ──
    /* v8 ignore start */
    return NextResponse.json({
      sessionId: session.id,
      questions: allQuestions.map((q, idx) => ({
        id: idx + 1,
        type: quizTypeToDbType.get(q.type) ?? "mcq",
        question: q.question,
        correctAnswer: q.correctAnswer,
        options: q.options,
        explanation: q.explanation,
      })),
    });
    /* v8 ignore stop */
  } catch (err) {
    console.error("[quiz/generate] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
