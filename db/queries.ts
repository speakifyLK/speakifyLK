import { cache } from "react";

import { auth } from "@clerk/nextjs/server";
import { and, eq, isNotNull } from "drizzle-orm";

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
      if (lesson.challenges.length === 0) return { ...lesson, completed: false };

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

/**
 * Lightweight query for quiz page - only fetches unit metadata and lesson counts.
 * Much more efficient than getUnits() which fetches all lessons, challenges, and progress.
 */
export const getUnitsForQuiz = cache(async () => {
  const userProgress = await getUserProgress();

  if (!userProgress?.activeCourseId) return [];

  const data = await db.query.units.findMany({
    where: eq(units.courseId, userProgress.activeCourseId),
    orderBy: (units, { asc }) => [asc(units.order)],
    columns: {
      id: true,
      title: true,
      description: true,
      order: true,
      courseId: true,
    },
    with: {
      lessons: {
        columns: {
          id: true,
        },
      },
    },
  });

  // Map to include lessons with completed property for type compatibility
  // Only the length is used by QuizConfig, so we keep the structure minimal
  return data.map((unit) => ({
    id: unit.id,
    title: unit.title,
    description: unit.description,
    order: unit.order,
    courseId: unit.courseId,
    lessons: unit.lessons.map((lesson) => ({ id: lesson.id, completed: false })),
  })) as Array<typeof units.$inferSelect & { lessons: Array<{ id: number; completed: boolean }> }>;
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

  const completedChallenges = lesson.challenges.filter((challenge) => challenge.completed);

  const percentage = Math.round((completedChallenges.length / lesson.challenges.length) * 100);

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
    data.stripePriceId && data.stripeCurrentPeriodEnd?.getTime() + DAY_IN_MS > Date.now();

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

// export const getConversationById = cache(async (conversationId: number) => {
//   const { userId } = await auth();

//   if (!userId) return null;

//   const data = await db.query.chatConversations.findFirst({
//     where: and(eq(chatConversations.id, conversationId), eq(chatConversations.userId, userId)),
//     with: {
//       messages: {
//         orderBy: (messages, { asc }) => [asc(messages.timestamp)],
//       },
//     },
//   });

//   if (!data) return null;

//   return data;
// });

export const getConversationById = async (conversationId: number) => {
  const { userId } = await auth();

  if (!userId) return null;

  const data = await db.query.chatConversations.findFirst({
    where: and(eq(chatConversations.id, conversationId), eq(chatConversations.userId, userId)),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.timestamp)],
      },
    },
  });

  if (!data) return null;

  return data;
};

export const getMessagesByConversation = cache(
  async (conversationId: number, limit = 20, offset = 0) => {
    const { userId } = await auth();

    if (!userId) return [];

    // Verify conversation ownership at DB level
    const conversation = await db.query.chatConversations.findFirst({
      where: and(eq(chatConversations.id, conversationId), eq(chatConversations.userId, userId)),
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
export const getUserLearningProfile = cache(async (): Promise<UserLearningProfile | null> => {
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
  // First get this user's most recent session IDs (bounded),
  // then query wrong answers scoped to those sessions.
  const userSessions = await db.query.aiQuizSessions.findMany({
    where: eq(aiQuizSessions.userId, userId),
    orderBy: (s, { desc }) => [desc(s.startedAt)],
    columns: { id: true },
    limit: 20,
  });
  const userSessionIds = userSessions.map((s) => s.id);

  let frequentlyMissedWords: string[] = [];

  if (userSessionIds.length > 0) {
    // Fetch wrong answers only for this user's sessions
    const allWrong: string[] = [];
    for (const sid of userSessionIds) {
      const wrong = await db.query.aiQuizQuestions.findMany({
        where: and(eq(aiQuizQuestions.sessionId, sid), eq(aiQuizQuestions.isCorrect, false)),
        columns: { correctAnswer: true },
        limit: 50,
      });
      allWrong.push(...wrong.map((w) => w.correctAnswer));
    }
    frequentlyMissedWords = [...new Set(allWrong)].slice(0, 20);
  }

  // ── 5. Derive overall level ──
  const completionRatio = totalLessons > 0 ? completedLessons.length / totalLessons : 0;
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
});

// ---------------------------------------------------------------------------
// Quiz Queries
// ---------------------------------------------------------------------------

/**
 * Returns the user's last 20 quiz sessions with score and topic
 */
export const getQuizHistory = cache(async () => {
  const { userId } = await auth();
  if (!userId) return [];

  const sessions = await db.query.aiQuizSessions.findMany({
    where: eq(aiQuizSessions.userId, userId),
    orderBy: (sessions, { desc }) => [desc(sessions.startedAt)],
    limit: 20,
    columns: {
      id: true,
      topic: true,
      difficulty: true,
      score: true,
      totalQuestions: true,
      correctAnswers: true,
      startedAt: true,
      completedAt: true,
    },
  });

  return sessions;
});

/**
 * Returns a session with all its questions for the review screen
 */
export const getQuizSessionWithQuestions = cache(async (sessionId: number) => {
  const { userId } = await auth();
  if (!userId) return null;

  const session = await db.query.aiQuizSessions.findFirst({
    where: and(eq(aiQuizSessions.id, sessionId), eq(aiQuizSessions.userId, userId)),
    with: {
      questions: {
        orderBy: (questions, { asc }) => [asc(questions.order)],
      },
    },
  });

  return session;
});

/**
 * Returns aggregate statistics for the user's quiz performance
 */
export const getQuizStats = cache(async () => {
  const { userId } = await auth();
  if (!userId) {
    return {
      totalQuizzes: 0,
      averageScore: 0,
      favouriteTopic: null,
      improvementTrend: "stable" as const,
    };
  }

  // Get completed sessions for the user (filtered at SQL level)
  // Limit to last 100 sessions for performance - enough for accurate stats and trend analysis
  const completedSessions = await db.query.aiQuizSessions.findMany({
    where: and(eq(aiQuizSessions.userId, userId), isNotNull(aiQuizSessions.completedAt)),
    columns: {
      id: true,
      topic: true,
      score: true,
      startedAt: true,
      completedAt: true,
    },
    orderBy: (sessions, { desc }) => [desc(sessions.startedAt)],
    limit: 100,
  });

  const totalQuizzes = completedSessions.length;

  if (totalQuizzes === 0) {
    return {
      totalQuizzes: 0,
      averageScore: 0,
      favouriteTopic: null,
      improvementTrend: "stable" as const,
    };
  }

  // Calculate average score
  const totalScore = completedSessions.reduce((sum, s) => sum + s.score, 0);
  const averageScore = Math.round(totalScore / totalQuizzes);

  // Find favourite topic (most frequently attempted)
  const topicCounts: Record<string, number> = {};
  completedSessions.forEach((s) => {
    topicCounts[s.topic] = (topicCounts[s.topic] || 0) + 1;
  });

  const favouriteTopic =
    Object.keys(topicCounts).length > 0
      ? Object.entries(topicCounts).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
      : null;

  // Calculate improvement trend
  // Compare average of first half vs second half of sessions
  const sortedSessions = [...completedSessions].sort(
    (a, b) => (a.startedAt?.getTime() || 0) - (b.startedAt?.getTime() || 0)
  );

  let improvementTrend: "improving" | "declining" | "stable" = "stable";

  if (sortedSessions.length >= 4) {
    const midpoint = Math.floor(sortedSessions.length / 2);
    const firstHalf = sortedSessions.slice(0, midpoint);
    const secondHalf = sortedSessions.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;

    const difference = secondHalfAvg - firstHalfAvg;

    if (difference > 5) {
      improvementTrend = "improving";
    } else if (difference < -5) {
      improvementTrend = "declining";
    }
  }

  return {
    totalQuizzes,
    averageScore,
    favouriteTopic,
    improvementTrend,
  };
});
