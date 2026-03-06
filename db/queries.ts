import { cache } from "react";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import db from "./drizzle";
import {
  aiQuizQuestions,
  aiQuizSessions,
  challengeProgress,
  chatConversations,
  chatMessages,
  courses,
  lessons,
  units,
  userProgress,
  userSubscription,
} from "./schema";

const DAY_IN_MS = 86_400_000;

export const getCourses = cache(async () => {
  const data = await db.query.courses.findMany();

  return data;
});

export const getUserProgress = cache(async () => {
  const { userId } = await auth();

  if (!userId) return null;

  const data = await db.query.userProgress.findFirst({
    where: eq(userProgress.userId, userId),
    with: {
      activeCourse: true,
    },
  });

  return data;
});

export const getUnits = cache(async () => {
  const { userId } = await auth();
  const userProgress = await getUserProgress();

  if (!userId || !userProgress?.activeCourseId) return [];

  const data = await db.query.units.findMany({
    where: eq(units.courseId, userProgress.activeCourseId),
    orderBy: (units, { asc }) => [asc(units.order)],
    with: {
      lessons: {
        orderBy: (lessons, { asc }) => [asc(lessons.order)],
        with: {
          challenges: {
            orderBy: (challenges, { asc }) => [asc(challenges.order)],
            with: {
              challengeProgress: {
                where: eq(challengeProgress.userId, userId),
              },
            },
          },
        },
      },
    },
  });

  const normalizedData = data.map((unit) => {
    const lessonsWithCompletedStatus = unit.lessons.map((lesson) => {
      if (lesson.challenges.length === 0)
        return { ...lesson, completed: false };

      const allCompletedChallenges = lesson.challenges.every((challenge) => {
        return (
          challenge.challengeProgress &&
          challenge.challengeProgress.length > 0 &&
          challenge.challengeProgress.every((progress) => progress.completed)
        );
      });

      return { ...lesson, completed: allCompletedChallenges };
    });

    return { ...unit, lessons: lessonsWithCompletedStatus };
  });

  return normalizedData;
});

export const getCourseById = cache(async (courseId: number) => {
  const data = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      units: {
        orderBy: (units, { asc }) => [asc(units.order)],
        with: {
          lessons: {
            orderBy: (lessons, { asc }) => [asc(lessons.order)],
          },
        },
      },
    },
  });

  return data;
});

export const getCourseProgress = cache(async () => {
  const { userId } = await auth();
  const userProgress = await getUserProgress();

  if (!userId || !userProgress?.activeCourseId) return null;

  const unitsInActiveCourse = await db.query.units.findMany({
    orderBy: (units, { asc }) => [asc(units.order)],
    where: eq(units.courseId, userProgress.activeCourseId),
    with: {
      lessons: {
        orderBy: (lessons, { asc }) => [asc(lessons.order)],
        with: {
          unit: true,
          challenges: {
            with: {
              challengeProgress: {
                where: eq(challengeProgress.userId, userId),
              },
            },
          },
        },
      },
    },
  });

  const firstUncompletedLesson = unitsInActiveCourse
    .flatMap((unit) => unit.lessons)
    .find((lesson) => {
      return lesson.challenges.some((challenge) => {
        return (
          !challenge.challengeProgress ||
          challenge.challengeProgress.length === 0 ||
          challenge.challengeProgress.some((progress) => !progress.completed)
        );
      });
    });

  return {
    activeLesson: firstUncompletedLesson,
    activeLessonId: firstUncompletedLesson?.id,
  };
});

export const getLesson = cache(async (id?: number) => {
  const { userId } = await auth();

  if (!userId) return null;

  const courseProgress = await getCourseProgress();
  const lessonId = id || courseProgress?.activeLessonId;

  if (!lessonId) return null;

  const data = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
    with: {
      challenges: {
        orderBy: (challenges, { asc }) => [asc(challenges.order)],
        with: {
          challengeOptions: true,
          challengeProgress: {
            where: eq(challengeProgress.userId, userId),
          },
        },
      },
    },
  });

  if (!data || !data.challenges) return null;

  const normalizedChallenges = data.challenges.map((challenge) => {
    const completed =
      challenge.challengeProgress &&
      challenge.challengeProgress.length > 0 &&
      challenge.challengeProgress.every((progress) => progress.completed);

    return { ...challenge, completed };
  });

  return { ...data, challenges: normalizedChallenges };
});

export const getLessonPercentage = cache(async () => {
  const courseProgress = await getCourseProgress();

  if (!courseProgress?.activeLessonId) return 0;

  const lesson = await getLesson(courseProgress?.activeLessonId);

  if (!lesson) return 0;

  const completedChallenges = lesson.challenges.filter(
    (challenge) => challenge.completed
  );

  const percentage = Math.round(
    (completedChallenges.length / lesson.challenges.length) * 100
  );

  return percentage;
});

export const getUserSubscription = cache(async () => {
  const { userId } = await auth();

  if (!userId) return null;

  const data = await db.query.userSubscription.findFirst({
    where: eq(userSubscription.userId, userId),
  });

  if (!data) return null;

  const isActive =
    data.stripePriceId &&
    data.stripeCurrentPeriodEnd?.getTime() + DAY_IN_MS > Date.now();

  return {
    ...data,
    isActive: !!isActive,
  };
});

export const getTopTenUsers = cache(async () => {
  const { userId } = await auth();

  if (!userId) return [];

  const data = await db.query.userProgress.findMany({
    orderBy: (userProgress, { desc }) => [desc(userProgress.points)],
    limit: 10,
    columns: {
      userId: true,
      userName: true,
      userImageSrc: true,
      points: true,
    },
  });

  return data;
});

// ── Chat Queries ─────────────────────────────────────────────────────

export const getConversations = cache(async () => {
  const { userId } = await auth();

  if (!userId) return [];

  const data = await db.query.chatConversations.findMany({
    where: eq(chatConversations.userId, userId),
    orderBy: (chatConversations, { desc }) => [desc(chatConversations.updatedAt)],
  });

  return data;
});

export const getConversationById = cache(async (conversationId: number) => {
  const { userId } = await auth();

  if (!userId) return null;

  const data = await db.query.chatConversations.findFirst({
    where: and(
      eq(chatConversations.id, conversationId),
      eq(chatConversations.userId, userId)
    ),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.timestamp)],
      },
    },
  });

  if (!data) return null;

  return data;
});

export const getMessagesByConversation = cache(
  async (conversationId: number, limit = 20, offset = 0) => {
    const { userId } = await auth();

    if (!userId) return [];

    // Verify conversation ownership at DB level
    const conversation = await db.query.chatConversations.findFirst({
      where: and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.userId, userId)
      ),
    });

    if (!conversation) return [];

    // Clamp pagination parameters to prevent expensive or invalid queries
    const MAX_LIMIT = 100;
    const safeLimit = Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT);
    const safeOffset = Math.max(0, Math.floor(offset));

    const data = await db.query.chatMessages.findMany({
      where: eq(chatMessages.conversationId, conversationId),
      orderBy: (messages, { asc }) => [asc(messages.timestamp)],
      limit: safeLimit,
      offset: safeOffset,
    });

    return data;
  }
);

// ---------------------------------------------------------------------------
// User learning profile for personalised AI quizzes
// ---------------------------------------------------------------------------

export interface UserLearningProfile {
  /** Titles of lessons the user has fully completed */
  completedLessons: string[];
  /** Titles of units where every lesson is completed */
  completedUnits: string[];
  /** Title of the unit the user is currently working on (first incomplete) */
  currentUnit: string | null;
  /** Lesson titles where the user scored < 50 % on challenges */
  weakTopics: string[];
  /** Lesson titles where the user scored ≥ 80 % on challenges */
  strongTopics: string[];
  /** Recent AI-quiz session scores (last 10) */
  recentQuizScores: {
    topic: string;
    score: number;
    difficulty: string;
  }[];
  /** Words / phrases the user answered incorrectly in AI quizzes */
  frequentlyMissedWords: string[];
  /** Derived overall level based on completion percentage */
  overallLevel: "beginner" | "intermediate" | "advanced";
}

/**
 * Builds a learning profile for the currently authenticated user.
 *
 * The profile inspects **every** unit in the user's active course
 * (regardless of how many units admins have created) and summarises
 * completed / weak / strong topics, recent quiz scores, and commonly
 * missed vocabulary. This is consumed by the AI quiz prompt builder
 * so Gemini can generate questions tailored to the learner.
 */
export const getUserLearningProfile = cache(
  async (): Promise<UserLearningProfile | null> => {
    const { userId } = await auth();
    if (!userId) return null;

    const progress = await getUserProgress();
    if (!progress?.activeCourseId) return null;

    // ── 1. Fetch ALL units, lessons & per-user challenge progress ──
    const allUnits = await db.query.units.findMany({
      where: eq(units.courseId, progress.activeCourseId),
      orderBy: (units, { asc }) => [asc(units.order)],
      with: {
        lessons: {
          orderBy: (lessons, { asc }) => [asc(lessons.order)],
          with: {
            challenges: {
              orderBy: (challenges, { asc }) => [asc(challenges.order)],
              with: {
                challengeProgress: {
                  where: eq(challengeProgress.userId, userId),
                },
              },
            },
          },
        },
      },
    });

    // ── 2. Classify lessons & units ──
    const completedLessons: string[] = [];
    const weakTopics: string[] = [];
    const strongTopics: string[] = [];
    const completedUnits: string[] = [];
    let currentUnit: string | null = null;
    let totalLessons = 0;

    for (const unit of allUnits) {
      let unitFullyCompleted = true;

      for (const lesson of unit.lessons) {
        totalLessons++;
        const total = lesson.challenges.length;
        if (total === 0) continue;

        const completed = lesson.challenges.filter((c) => {
          return (
            c.challengeProgress &&
            c.challengeProgress.length > 0 &&
            c.challengeProgress.every((p) => p.completed)
          );
        }).length;

        const accuracy = completed / total;

        if (accuracy === 1) {
          completedLessons.push(lesson.title);
        } else {
          unitFullyCompleted = false;
        }

        if (accuracy < 0.5 && total > 0) {
          weakTopics.push(lesson.title);
        } else if (accuracy >= 0.8) {
          strongTopics.push(lesson.title);
        }
      }

      if (unitFullyCompleted && unit.lessons.length > 0) {
        completedUnits.push(unit.title);
      }

      if (!unitFullyCompleted && !currentUnit) {
        currentUnit = unit.title;
      }
    }

    // ── 3. Fetch recent AI-quiz session scores (last 10) ──
    const recentSessions = await db.query.aiQuizSessions.findMany({
      where: eq(aiQuizSessions.userId, userId),
      orderBy: (s, { desc }) => [desc(s.startedAt)],
      limit: 10,
      columns: {
        topic: true,
        score: true,
        difficulty: true,
      },
    });

    const recentQuizScores = recentSessions.map((s) => ({
      topic: s.topic,
      score: s.score,
      difficulty: s.difficulty,
    }));

    // ── 4. Gather frequently-missed words from AI-quiz answers ──
    const wrongAnswers = await db.query.aiQuizQuestions.findMany({
      where: eq(aiQuizQuestions.isCorrect, false),
      columns: {
        correctAnswer: true,
        sessionId: true,
      },
      limit: 50,
    });

    // Filter to only this user's sessions
    const userSessionIds = new Set(
      recentSessions.length > 0
        ? (
            await db.query.aiQuizSessions.findMany({
              where: eq(aiQuizSessions.userId, userId),
              columns: { id: true },
            })
          ).map((s) => s.id)
        : []
    );

    const frequentlyMissedWords = [
      ...new Set(
        wrongAnswers
          .filter((a) => userSessionIds.has(a.sessionId))
          .map((a) => a.correctAnswer)
      ),
    ].slice(0, 20);

    // ── 5. Derive overall level ──
    const completionRatio =
      totalLessons > 0 ? completedLessons.length / totalLessons : 0;
    let overallLevel: "beginner" | "intermediate" | "advanced" = "beginner";
    if (completionRatio >= 0.7) overallLevel = "advanced";
    else if (completionRatio >= 0.35) overallLevel = "intermediate";

    return {
      completedLessons,
      completedUnits,
      currentUnit,
      weakTopics,
      strongTopics,
      recentQuizScores,
      frequentlyMissedWords,
      overallLevel,
    };
  }
);
