import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import db from "@/db/drizzle";
import { getUserLearningProfile, getUserProgress } from "@/db/queries";
import { aiQuizQuestions, aiQuizSessions } from "@/db/schema";
import { generateContent } from "@/lib/gemini";
import {
  parseGeminiQuizResponse,
  quizTypeToDbType,
} from "@/lib/quiz-normalise";
import { buildQuizPrompt } from "@/lib/quiz-prompt";

export async function GET() {
  const steps: string[] = [];
  try {
    // Step 1: Auth
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    steps.push("1. Auth OK: " + userId);

    // Step 2: User progress
    const userProgress = await getUserProgress();
    if (!userProgress?.activeCourseId) {
      return NextResponse.json({ steps, error: "No active course" }, { status: 400 });
    }
    steps.push("2. UserProgress OK, courseId: " + userProgress.activeCourseId);

    // Step 3: Learning profile
    const profile = await getUserLearningProfile();
    steps.push("3. LearningProfile OK: " + (profile ? "has profile" : "null"));

    // Step 4: Build prompt (just 1 MCQ question for testing)
    const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
      topic: "greetings",
      difficulty: "beginner",
      count: 1,
      learningContext: profile ? {
        completedTopics: profile.completedLessons,
        weakTopics: profile.weakTopics,
        strongTopics: profile.strongTopics,
        frequentlyMissedWords: profile.frequentlyMissedWords,
        overallLevel: profile.overallLevel,
      } : undefined,
    });
    steps.push("4. Prompt built OK, length: " + prompt.length);

    // Step 5: Call Gemini
    const geminiResponse = await generateContent(prompt);
    const responseText = geminiResponse.text ?? "";
    steps.push("5. Gemini response OK, length: " + responseText.length);
    steps.push("5b. Response preview: " + responseText.slice(0, 200));

    // Step 6: Parse response
    const questions = parseGeminiQuizResponse(responseText, "MULTIPLE_CHOICE");
    steps.push("6. Parsed OK, got " + questions.length + " questions");

    // Step 7: DB transaction
    const session = await db.transaction(async (tx) => {
      const [createdSession] = await tx
        .insert(aiQuizSessions)
        .values({
          userId,
          topic: "greetings",
          difficulty: "beginner",
          totalQuestions: questions.length,
          courseId: userProgress.activeCourseId!,
        })
        .returning({ id: aiQuizSessions.id });

      steps.push("7a. Session created: " + createdSession.id);

      await tx.insert(aiQuizQuestions).values(
        questions.map((q, idx) => ({
          sessionId: createdSession.id,
          type: quizTypeToDbType.get("MULTIPLE_CHOICE") ?? "mcq",
          question: q.question,
          options: q.options ?? null,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          order: idx + 1,
        }))
      );

      steps.push("7b. Questions inserted");
      return createdSession;
    });

    steps.push("8. Transaction complete, sessionId: " + session.id);

    return NextResponse.json({ success: true, steps, sessionId: session.id });
  } catch (err: unknown) {
    const error = err as Error;
    steps.push("ERROR: " + error.message);
    return NextResponse.json({
      success: false,
      steps,
      error: error.message,
      stack: error.stack?.split("\n").slice(0, 8),
    }, { status: 500 });
  }
}
