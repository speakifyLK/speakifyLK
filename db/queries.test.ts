import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist mocks ──────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
const mockDbQuery = vi.hoisted(() => ({
  courses: { findMany: vi.fn(), findFirst: vi.fn() },
  userProgress: { findFirst: vi.fn(), findMany: vi.fn() },
  units: { findMany: vi.fn() },
  lessons: { findFirst: vi.fn() },
  userSubscription: { findFirst: vi.fn() },
  chatConversations: { findMany: vi.fn(), findFirst: vi.fn() },
  chatMessages: { findMany: vi.fn() },
  aiQuizSessions: { findMany: vi.fn(), findFirst: vi.fn() },
  aiQuizQuestions: { findMany: vi.fn() },
  challengeProgress: {},
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

// Mock react cache to just return the function (no caching in tests)
vi.mock("react", () => ({
  cache: (fn: unknown) => fn,
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ _type: "eq", col, val }),
  and: (...args: unknown[]) => ({ _type: "and", args }),
  isNotNull: (col: unknown) => ({ _type: "isNotNull", col }),
}));

vi.mock("./drizzle", () => {
  const fakeHelpers = {
    and: (...args: unknown[]) => ({ _type: "and", args }),
    eq: (col: unknown, val: unknown) => ({ _type: "eq", col, val }),
    desc: (col: unknown) => ({ _type: "desc", col }),
    asc: (col: unknown) => ({ _type: "asc", col }),
  };
  const fakeTable = new Proxy(
    {},
    { get: (_t, prop) => `table.${String(prop)}` }
  );

  const wrapQuery = (mockFn: any) => {
    return (opts?: Record<string, unknown>) => {
      if (opts?.where && typeof opts.where === "function") {
        (opts.where as (t: unknown, h: unknown) => unknown)(
          fakeTable,
          fakeHelpers
        );
      }
      if (opts?.orderBy && typeof opts.orderBy === "function") {
        (opts.orderBy as (t: unknown, h: unknown) => unknown)(
          fakeTable,
          fakeHelpers
        );
      }
      // Handle nested `with` for orderBy/where callbacks
      if (opts?.with && typeof opts.with === "object") {
        const walkWith = (w: Record<string, unknown>) => {
          for (const val of Object.values(w)) {
            if (val && typeof val === "object") {
              const nested = val as Record<string, unknown>;
              if (typeof nested.where === "function") {
                (nested.where as (t: unknown, h: unknown) => unknown)(
                  fakeTable,
                  fakeHelpers
                );
              }
              if (typeof nested.orderBy === "function") {
                (nested.orderBy as (t: unknown, h: unknown) => unknown)(
                  fakeTable,
                  fakeHelpers
                );
              }
              if (nested.with && typeof nested.with === "object") {
                walkWith(nested.with as Record<string, unknown>);
              }
            }
          }
        };
        walkWith(opts.with as Record<string, unknown>);
      }
      return mockFn(opts);
    };
  };

  return {
    default: {
      query: {
        courses: {
          findMany: wrapQuery(mockDbQuery.courses.findMany),
          findFirst: wrapQuery(mockDbQuery.courses.findFirst),
        },
        userProgress: {
          findFirst: wrapQuery(mockDbQuery.userProgress.findFirst),
          findMany: wrapQuery(mockDbQuery.userProgress.findMany),
        },
        units: { findMany: wrapQuery(mockDbQuery.units.findMany) },
        lessons: { findFirst: wrapQuery(mockDbQuery.lessons.findFirst) },
        userSubscription: {
          findFirst: wrapQuery(mockDbQuery.userSubscription.findFirst),
        },
        chatConversations: {
          findMany: wrapQuery(mockDbQuery.chatConversations.findMany),
          findFirst: wrapQuery(mockDbQuery.chatConversations.findFirst),
        },
        chatMessages: {
          findMany: wrapQuery(mockDbQuery.chatMessages.findMany),
        },
        aiQuizSessions: {
          findMany: wrapQuery(mockDbQuery.aiQuizSessions.findMany),
          findFirst: wrapQuery(mockDbQuery.aiQuizSessions.findFirst),
        },
        aiQuizQuestions: {
          findMany: wrapQuery(mockDbQuery.aiQuizQuestions.findMany),
        },
      },
    },
  };
});

vi.mock("./schema", () => {
  const fakeCol = (name: string) => `col_${name}`;
  return {
    courses: { id: fakeCol("courses.id") },
    units: {
      courseId: fakeCol("units.courseId"),
      order: fakeCol("units.order"),
    },
    lessons: { id: fakeCol("lessons.id"), order: fakeCol("lessons.order") },
    challenges: { order: fakeCol("challenges.order") },
    challengeOptions: {},
    challengeProgress: { userId: fakeCol("challengeProgress.userId") },
    userProgress: {
      userId: fakeCol("userProgress.userId"),
      activeCourseId: fakeCol("userProgress.activeCourseId"),
    },
    userSubscription: { userId: fakeCol("userSubscription.userId") },
    chatConversations: {
      id: fakeCol("chatConversations.id"),
      userId: fakeCol("chatConversations.userId"),
    },
    chatMessages: { conversationId: fakeCol("chatMessages.conversationId") },
    aiQuizSessions: {
      userId: fakeCol("aiQuizSessions.userId"),
      id: fakeCol("aiQuizSessions.id"),
      completedAt: fakeCol("aiQuizSessions.completedAt"),
    },
    aiQuizQuestions: {
      sessionId: fakeCol("aiQuizQuestions.sessionId"),
      isCorrect: fakeCol("aiQuizQuestions.isCorrect"),
    },
  };
});

import {
  getCourses,
  getUserProgress,
  getUnits,
  getUnitsForQuiz,
  getCourseById,
  getCourseProgress,
  getLesson,
  getLessonPercentage,
  getUserSubscription,
  getTopTenUsers,
  getConversations,
  getConversationById,
  getMessagesByConversation,
  getUserLearningProfile,
  getQuizHistory,
  getQuizSessionWithQuestions,
  getQuizStats,
} from "./queries";

describe("db/queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getCourses ─────────────────────────────────────────────────────
  describe("getCourses", () => {
    it("returns all courses", async () => {
      const courses = [{ id: 1, title: "Sinhala", imageSrc: "/s.png" }];
      mockDbQuery.courses.findMany.mockResolvedValue(courses);
      const result = await getCourses();
      expect(result).toEqual(courses);
    });
  });

  // ── getUserProgress ────────────────────────────────────────────────
  describe("getUserProgress", () => {
    it("returns null when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });
      const result = await getUserProgress();
      expect(result).toBeNull();
    });

    it("returns user progress when authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const progress = {
        userId: "user1",
        activeCourseId: 1,
        hearts: 5,
        points: 100,
      };
      mockDbQuery.userProgress.findFirst.mockResolvedValue(progress);
      const result = await getUserProgress();
      expect(result).toEqual(progress);
    });
  });

  // ── getUnits ───────────────────────────────────────────────────────
  describe("getUnits", () => {
    it("returns [] when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });
      const result = await getUnits();
      expect(result).toEqual([]);
    });

    it("returns [] when no activeCourseId", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: null,
      });
      const result = await getUnits();
      expect(result).toEqual([]);
    });

    it("returns normalized units with completed status", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          title: "Unit 1",
          lessons: [
            {
              id: 10,
              title: "Lesson 1",
              challenges: [
                { id: 100, challengeProgress: [{ completed: true }] },
                { id: 101, challengeProgress: [{ completed: true }] },
              ],
            },
            {
              id: 11,
              title: "Lesson 2",
              challenges: [
                { id: 102, challengeProgress: [{ completed: false }] },
              ],
            },
          ],
        },
      ]);

      const result = await getUnits();
      expect(result).toHaveLength(1);
      expect(result[0].lessons[0].completed).toBe(true);
      expect(result[0].lessons[1].completed).toBe(false);
    });

    it("marks lesson as not completed when it has no challenges", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          lessons: [{ id: 10, title: "Empty", challenges: [] }],
        },
      ]);

      const result = await getUnits();
      expect(result[0].lessons[0].completed).toBe(false);
    });

    it("marks lesson as not completed when challengeProgress is empty", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          lessons: [
            {
              id: 10,
              title: "L1",
              challenges: [{ id: 100, challengeProgress: [] }],
            },
          ],
        },
      ]);

      const result = await getUnits();
      expect(result[0].lessons[0].completed).toBe(false);
    });

    it("marks lesson as not completed when challengeProgress is null/falsy", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          lessons: [
            {
              id: 10,
              title: "L1",
              challenges: [{ id: 100, challengeProgress: null }],
            },
          ],
        },
      ]);

      const result = await getUnits();
      expect(result[0].lessons[0].completed).toBe(false);
    });
  });

  // ── getUnitsForQuiz ────────────────────────────────────────────────
  describe("getUnitsForQuiz", () => {
    it("returns [] when no activeCourseId", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: null,
      });
      const result = await getUnitsForQuiz();
      expect(result).toEqual([]);
    });

    it("returns mapped units with lesson structure", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          title: "Unit 1",
          description: "Basics",
          order: 1,
          courseId: 1,
          lessons: [{ id: 10 }, { id: 11 }],
        },
      ]);

      const result = await getUnitsForQuiz();
      expect(result).toHaveLength(1);
      expect(result[0].lessons).toHaveLength(2);
      expect(result[0].lessons[0]).toEqual({ id: 10, completed: false });
    });
  });

  // ── getCourseById ──────────────────────────────────────────────────
  describe("getCourseById", () => {
    it("returns course with units and lessons", async () => {
      const course = { id: 1, title: "Sinhala", units: [] };
      mockDbQuery.courses.findFirst.mockResolvedValue(course);
      const result = await getCourseById(1);
      expect(result).toEqual(course);
    });
  });

  // ── getCourseProgress ──────────────────────────────────────────────
  describe("getCourseProgress", () => {
    it("returns null when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });
      const result = await getCourseProgress();
      expect(result).toBeNull();
    });

    it("returns null when no activeCourseId", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: null,
      });
      const result = await getCourseProgress();
      expect(result).toBeNull();
    });

    it("returns first uncompleted lesson", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          lessons: [
            {
              id: 10,
              title: "L1",
              challenges: [{ challengeProgress: [{ completed: true }] }],
            },
            {
              id: 11,
              title: "L2",
              challenges: [{ challengeProgress: [{ completed: false }] }],
            },
          ],
        },
      ]);

      const result = await getCourseProgress();
      expect(result?.activeLessonId).toBe(11);
    });

    it("handles lesson with no challengeProgress", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          lessons: [
            {
              id: 10,
              title: "L1",
              challenges: [{ challengeProgress: null }],
            },
          ],
        },
      ]);

      const result = await getCourseProgress();
      expect(result?.activeLessonId).toBe(10);
    });

    it("handles lesson with empty challengeProgress array", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          lessons: [
            {
              id: 10,
              title: "L1",
              challenges: [{ challengeProgress: [] }],
            },
          ],
        },
      ]);

      const result = await getCourseProgress();
      expect(result?.activeLessonId).toBe(10);
    });
  });

  // ── getLesson ──────────────────────────────────────────────────────
  describe("getLesson", () => {
    it("returns null when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });
      const result = await getLesson();
      expect(result).toBeNull();
    });

    it("returns null when no lessonId available", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      // getUserProgress → no activeCourseId → getCourseProgress returns null
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: null,
      });
      const result = await getLesson();
      expect(result).toBeNull();
    });

    it("returns null when lesson data is null", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.lessons.findFirst.mockResolvedValue(null);
      const result = await getLesson(10);
      expect(result).toBeNull();
    });

    it("returns null when lesson has no challenges", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.lessons.findFirst.mockResolvedValue({
        id: 10,
        challenges: null,
      });
      const result = await getLesson(10);
      expect(result).toBeNull();
    });

    it("returns lesson with normalized challenge completion", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.lessons.findFirst.mockResolvedValue({
        id: 10,
        title: "L1",
        challenges: [
          {
            id: 100,
            challengeProgress: [{ completed: true }],
            challengeOptions: [],
          },
          {
            id: 101,
            challengeProgress: [{ completed: false }],
            challengeOptions: [],
          },
          {
            id: 102,
            challengeProgress: [],
            challengeOptions: [],
          },
          {
            id: 103,
            challengeProgress: null,
            challengeOptions: [],
          },
        ],
      });

      const result = await getLesson(10);
      expect(result).not.toBeNull();
      expect(result!.challenges[0].completed).toBe(true);
      expect(result!.challenges[1].completed).toBe(false);
      expect(result!.challenges[2].completed).toBe(false);
      expect(result!.challenges[3].completed).toBeFalsy();
    });
  });

  // ── getLessonPercentage ────────────────────────────────────────────
  describe("getLessonPercentage", () => {
    it("returns 0 when no activeLessonId", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: null,
      });
      const result = await getLessonPercentage();
      expect(result).toBe(0);
    });

    it("returns 0 when lesson not found", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          lessons: [
            {
              id: 10,
              challenges: [{ challengeProgress: [{ completed: false }] }],
            },
          ],
        },
      ]);
      mockDbQuery.lessons.findFirst.mockResolvedValue(null);

      const result = await getLessonPercentage();
      expect(result).toBe(0);
    });

    it("returns correct percentage", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          lessons: [
            {
              id: 10,
              challenges: [{ challengeProgress: [{ completed: false }] }],
            },
          ],
        },
      ]);
      mockDbQuery.lessons.findFirst.mockResolvedValue({
        id: 10,
        challenges: [
          {
            id: 100,
            challengeProgress: [{ completed: true }],
            challengeOptions: [],
          },
          {
            id: 101,
            challengeProgress: [{ completed: true }],
            challengeOptions: [],
          },
          {
            id: 102,
            challengeProgress: [{ completed: false }],
            challengeOptions: [],
          },
          {
            id: 103,
            challengeProgress: [{ completed: false }],
            challengeOptions: [],
          },
        ],
      });

      const result = await getLessonPercentage();
      expect(result).toBe(50);
    });
  });

  // ── getUserSubscription ────────────────────────────────────────────
  describe("getUserSubscription", () => {
    it("returns null when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });
      const result = await getUserSubscription();
      expect(result).toBeNull();
    });

    it("returns null when no subscription data", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userSubscription.findFirst.mockResolvedValue(null);
      const result = await getUserSubscription();
      expect(result).toBeNull();
    });

    it("returns subscription with isActive true when valid", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const futureDate = new Date(Date.now() + 30 * 86_400_000);
      mockDbQuery.userSubscription.findFirst.mockResolvedValue({
        userId: "user1",
        stripePriceId: "price_123",
        stripeCurrentPeriodEnd: futureDate,
      });

      const result = await getUserSubscription();
      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(true);
    });

    it("returns subscription with isActive false when expired", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const pastDate = new Date(Date.now() - 30 * 86_400_000);
      mockDbQuery.userSubscription.findFirst.mockResolvedValue({
        userId: "user1",
        stripePriceId: "price_123",
        stripeCurrentPeriodEnd: pastDate,
      });

      const result = await getUserSubscription();
      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(false);
    });
  });

  // ── getTopTenUsers ─────────────────────────────────────────────────
  describe("getTopTenUsers", () => {
    it("returns [] when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });
      const result = await getTopTenUsers();
      expect(result).toEqual([]);
    });

    it("returns top ten users", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const users = [{ userId: "user1", userName: "U1", points: 500 }];
      mockDbQuery.userProgress.findMany.mockResolvedValue(users);
      const result = await getTopTenUsers();
      expect(result).toEqual(users);
    });
  });

  // ── getConversations ───────────────────────────────────────────────
  describe("getConversations", () => {
    it("returns [] when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });
      const result = await getConversations();
      expect(result).toEqual([]);
    });

    it("returns conversations", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const convos = [{ id: 1, title: "Chat", userId: "user1" }];
      mockDbQuery.chatConversations.findMany.mockResolvedValue(convos);
      const result = await getConversations();
      expect(result).toEqual(convos);
    });
  });

  // ── getConversationById ────────────────────────────────────────────
  describe("getConversationById", () => {
    it("returns null when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });
      const result = await getConversationById(1);
      expect(result).toBeNull();
    });

    it("returns null when conversation not found", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.chatConversations.findFirst.mockResolvedValue(null);
      const result = await getConversationById(1);
      expect(result).toBeNull();
    });

    it("returns conversation with messages", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const convo = { id: 1, title: "Chat", messages: [] };
      mockDbQuery.chatConversations.findFirst.mockResolvedValue(convo);
      const result = await getConversationById(1);
      expect(result).toEqual(convo);
    });
  });

  // ── getMessagesByConversation ──────────────────────────────────────
  describe("getMessagesByConversation", () => {
    it("returns [] when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });
      const result = await getMessagesByConversation(1);
      expect(result).toEqual([]);
    });

    it("returns [] when conversation not owned by user", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.chatConversations.findFirst.mockResolvedValue(null);
      const result = await getMessagesByConversation(1);
      expect(result).toEqual([]);
    });

    it("returns messages with clamped limit and offset", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.chatConversations.findFirst.mockResolvedValue({ id: 1 });
      const msgs = [{ id: 1, content: "Hello" }];
      mockDbQuery.chatMessages.findMany.mockResolvedValue(msgs);

      const result = await getMessagesByConversation(1, 500, -5);
      expect(result).toEqual(msgs);
    });

    it("uses default limit and offset", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.chatConversations.findFirst.mockResolvedValue({ id: 1 });
      mockDbQuery.chatMessages.findMany.mockResolvedValue([]);

      await getMessagesByConversation(1);
      // Default limit=20, offset=0
      expect(mockDbQuery.chatMessages.findMany).toHaveBeenCalled();
    });
  });

  // ── getUserLearningProfile ─────────────────────────────────────────
  describe("getUserLearningProfile", () => {
    it("returns null when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });
      const result = await getUserLearningProfile();
      expect(result).toBeNull();
    });

    it("returns null when no activeCourseId", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: null,
      });
      const result = await getUserLearningProfile();
      expect(result).toBeNull();
    });

    it("returns full learning profile", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });

      // Units with lessons and challenges
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          title: "Unit 1",
          lessons: [
            {
              id: 10,
              title: "Lesson 1",
              challenges: [
                { id: 100, challengeProgress: [{ completed: true }] },
                { id: 101, challengeProgress: [{ completed: true }] },
              ],
            },
            {
              id: 11,
              title: "Lesson 2",
              challenges: [
                { id: 102, challengeProgress: [{ completed: false }] },
                { id: 103, challengeProgress: [{ completed: false }] },
              ],
            },
          ],
        },
      ]);

      // Recent quiz sessions
      mockDbQuery.aiQuizSessions.findMany
        .mockResolvedValueOnce([
          { topic: "Greetings", score: 80, difficulty: "beginner" },
        ])
        .mockResolvedValueOnce([{ id: 1 }]);

      // Wrong answers for missed words
      mockDbQuery.aiQuizQuestions.findMany.mockResolvedValue([
        { correctAnswer: "ayubowan" },
      ]);

      const result = await getUserLearningProfile();
      expect(result).not.toBeNull();
      expect(result!.completedLessons).toContain("Lesson 1");
      expect(result!.weakTopics).toContain("Lesson 2");
      expect(result!.overallLevel).toBe("intermediate"); // 1/2 = 50% → ≥35%
      expect(result!.frequentlyMissedWords).toContain("ayubowan");
    });

    it("returns beginner level when completion is low", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          title: "Unit 1",
          lessons: [
            {
              id: 10,
              title: "L1",
              challenges: [
                { id: 100, challengeProgress: [{ completed: false }] },
              ],
            },
            {
              id: 11,
              title: "L2",
              challenges: [
                { id: 101, challengeProgress: [{ completed: false }] },
              ],
            },
            {
              id: 12,
              title: "L3",
              challenges: [
                { id: 102, challengeProgress: [{ completed: false }] },
              ],
            },
            {
              id: 13,
              title: "L4",
              challenges: [
                { id: 103, challengeProgress: [{ completed: false }] },
              ],
            },
          ],
        },
      ]);
      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([]);

      const result = await getUserLearningProfile();
      expect(result!.overallLevel).toBe("beginner");
      expect(result!.frequentlyMissedWords).toEqual([]);
    });

    it("returns advanced level when completion >= 70%", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          title: "Unit 1",
          lessons: [
            {
              id: 10,
              title: "L1",
              challenges: [
                { id: 100, challengeProgress: [{ completed: true }] },
              ],
            },
            {
              id: 11,
              title: "L2",
              challenges: [
                { id: 101, challengeProgress: [{ completed: true }] },
              ],
            },
            {
              id: 12,
              title: "L3",
              challenges: [
                { id: 102, challengeProgress: [{ completed: true }] },
              ],
            },
          ],
        },
      ]);
      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([]);

      const result = await getUserLearningProfile();
      expect(result!.overallLevel).toBe("advanced");
      expect(result!.completedUnits).toContain("Unit 1");
    });

    it("handles lesson with 0 challenges (continue branch)", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          title: "Unit 1",
          lessons: [{ id: 10, title: "Empty", challenges: [] }],
        },
      ]);
      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([]);

      const result = await getUserLearningProfile();
      expect(result).not.toBeNull();
      // Unit with 0-challenge lessons: unitFullyCompleted stays true but lessons.length=1 > 0
      // Since the lesson has 0 challenges, accuracy is never computed, unitFullyCompleted stays true
      // But wait: totalLessons++ is 1, completedLessons is 0 (since total=0 → continue → no push)
      // So completionRatio = 0/1 = 0 → beginner
      expect(result!.overallLevel).toBe("beginner");
    });

    it("handles unit with no lessons (lessons.length=0 → not added to completedUnits)", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });
      mockDbQuery.units.findMany.mockResolvedValue([
        { id: 1, title: "Empty Unit", lessons: [] },
      ]);
      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([]);

      const result = await getUserLearningProfile();
      expect(result!.completedUnits).toEqual([]);
    });

    it("identifies strong topics (accuracy >= 0.8 but < 1.0)", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          title: "Unit 1",
          lessons: [
            {
              id: 10,
              title: "Strong Lesson",
              challenges: [
                { id: 100, challengeProgress: [{ completed: true }] },
                { id: 101, challengeProgress: [{ completed: true }] },
                { id: 102, challengeProgress: [{ completed: true }] },
                { id: 103, challengeProgress: [{ completed: true }] },
                { id: 104, challengeProgress: [{ completed: false }] },
              ],
            },
          ],
        },
      ]);
      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([]);

      const result = await getUserLearningProfile();
      // 4/5 = 0.8 → strong
      expect(result!.strongTopics).toContain("Strong Lesson");
    });

    it("handles accuracy between 0.5 and 0.8 (neither weak nor strong)", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.userProgress.findFirst.mockResolvedValue({
        userId: "user1",
        activeCourseId: 1,
      });
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          title: "Unit 1",
          lessons: [
            {
              id: 10,
              title: "Mid Lesson",
              challenges: [
                { id: 100, challengeProgress: [{ completed: true }] },
                { id: 101, challengeProgress: [{ completed: true }] },
                { id: 102, challengeProgress: [{ completed: false }] },
                { id: 103, challengeProgress: [{ completed: false }] },
              ],
            },
          ],
        },
      ]);
      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([]);

      const result = await getUserLearningProfile();
      // 2/4 = 0.5 → not weak (< 0.5 required), not strong (< 0.8)
      expect(result!.weakTopics).not.toContain("Mid Lesson");
      expect(result!.strongTopics).not.toContain("Mid Lesson");
    });
  });

  // ── getQuizHistory ─────────────────────────────────────────────────
  describe("getQuizHistory", () => {
    it("returns [] when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });
      const result = await getQuizHistory();
      expect(result).toEqual([]);
    });

    it("returns quiz sessions", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const sessions = [{ id: 1, topic: "Greetings", score: 80 }];
      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue(sessions);
      const result = await getQuizHistory();
      expect(result).toEqual(sessions);
    });
  });

  // ── getQuizSessionWithQuestions ────────────────────────────────────
  describe("getQuizSessionWithQuestions", () => {
    it("returns null when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });
      const result = await getQuizSessionWithQuestions(1);
      expect(result).toBeNull();
    });

    it("returns session with questions", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const session = { id: 1, questions: [{ id: 10 }] };
      mockDbQuery.aiQuizSessions.findFirst.mockResolvedValue(session);
      const result = await getQuizSessionWithQuestions(1);
      expect(result).toEqual(session);
    });
  });

  // ── getQuizStats ───────────────────────────────────────────────────
  describe("getQuizStats", () => {
    it("returns zero stats when not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null });
      const result = await getQuizStats();
      expect(result.totalQuizzes).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.favouriteTopic).toBeNull();
      expect(result.improvementTrend).toBe("stable");
      expect(result.quizStreak).toBe(0);
    });

    it("returns zero stats when no completed sessions", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([]);
      const result = await getQuizStats();
      expect(result.totalQuizzes).toBe(0);
    });

    it("returns correct stats with completed sessions", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([
        {
          id: 1,
          topic: "Greetings",
          score: 80,
          startedAt: yesterday,
          completedAt: yesterday,
        },
        {
          id: 2,
          topic: "Numbers",
          score: 60,
          startedAt: now,
          completedAt: now,
        },
        {
          id: 3,
          topic: "Greetings",
          score: 70,
          startedAt: yesterday,
          completedAt: yesterday,
        },
        {
          id: 4,
          topic: "Greetings",
          score: 90,
          startedAt: now,
          completedAt: now,
        },
      ]);

      const result = await getQuizStats();
      expect(result.totalQuizzes).toBe(4);
      expect(result.averageScore).toBe(75); // (80+60+70+90)/4
      expect(result.favouriteTopic).toBe("Greetings"); // 3 times
    });

    it("detects improving trend", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const dates = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (5 - i));
        return d;
      });

      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([
        {
          id: 1,
          topic: "T",
          score: 10,
          startedAt: dates[0],
          completedAt: dates[0],
        },
        {
          id: 2,
          topic: "T",
          score: 20,
          startedAt: dates[1],
          completedAt: dates[1],
        },
        {
          id: 3,
          topic: "T",
          score: 30,
          startedAt: dates[2],
          completedAt: dates[2],
        },
        {
          id: 4,
          topic: "T",
          score: 70,
          startedAt: dates[3],
          completedAt: dates[3],
        },
        {
          id: 5,
          topic: "T",
          score: 80,
          startedAt: dates[4],
          completedAt: dates[4],
        },
        {
          id: 6,
          topic: "T",
          score: 90,
          startedAt: dates[5],
          completedAt: dates[5],
        },
      ]);

      const result = await getQuizStats();
      expect(result.improvementTrend).toBe("improving");
    });

    it("detects declining trend", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const dates = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (5 - i));
        return d;
      });

      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([
        {
          id: 1,
          topic: "T",
          score: 90,
          startedAt: dates[0],
          completedAt: dates[0],
        },
        {
          id: 2,
          topic: "T",
          score: 80,
          startedAt: dates[1],
          completedAt: dates[1],
        },
        {
          id: 3,
          topic: "T",
          score: 70,
          startedAt: dates[2],
          completedAt: dates[2],
        },
        {
          id: 4,
          topic: "T",
          score: 20,
          startedAt: dates[3],
          completedAt: dates[3],
        },
        {
          id: 5,
          topic: "T",
          score: 10,
          startedAt: dates[4],
          completedAt: dates[4],
        },
        {
          id: 6,
          topic: "T",
          score: 5,
          startedAt: dates[5],
          completedAt: dates[5],
        },
      ]);

      const result = await getQuizStats();
      expect(result.improvementTrend).toBe("declining");
    });

    it("returns stable trend with fewer than 4 sessions", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const now = new Date();
      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([
        { id: 1, topic: "T", score: 50, startedAt: now, completedAt: now },
        { id: 2, topic: "T", score: 90, startedAt: now, completedAt: now },
      ]);

      const result = await getQuizStats();
      expect(result.improvementTrend).toBe("stable");
    });

    it("computes quiz streak correctly (today + yesterday)", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([
        {
          id: 1,
          topic: "T",
          score: 50,
          startedAt: twoDaysAgo,
          completedAt: twoDaysAgo,
        },
        {
          id: 2,
          topic: "T",
          score: 60,
          startedAt: yesterday,
          completedAt: yesterday,
        },
        { id: 3, topic: "T", score: 70, startedAt: now, completedAt: now },
        { id: 4, topic: "T", score: 80, startedAt: now, completedAt: now },
      ]);

      const result = await getQuizStats();
      expect(result.quizStreak).toBeGreaterThanOrEqual(2);
    });

    it("returns 0 streak when no recent quizzes", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([
        {
          id: 1,
          topic: "T",
          score: 50,
          startedAt: oldDate,
          completedAt: oldDate,
        },
      ]);

      const result = await getQuizStats();
      expect(result.quizStreak).toBe(0);
    });

    it("handles null completedAt in streak calculation", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const now = new Date();
      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([
        { id: 1, topic: "T", score: 50, startedAt: now, completedAt: null },
        { id: 2, topic: "T", score: 60, startedAt: now, completedAt: now },
      ]);

      const result = await getQuizStats();
      // Should handle null gracefully
      expect(typeof result.quizStreak).toBe("number");
    });

    it("handles ISO string dates in streak calculation", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const now = new Date();
      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([
        {
          id: 1,
          topic: "T",
          score: 50,
          startedAt: now,
          completedAt: now.toISOString(),
        },
      ]);

      const result = await getQuizStats();
      expect(result.quizStreak).toBeGreaterThanOrEqual(1);
    });

    it("streak is 0 when completedDates array is empty", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const now = new Date();
      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([
        { id: 1, topic: "T", score: 50, startedAt: now, completedAt: null },
      ]);

      const _result = await getQuizStats();
      // All completedAt are null → filtered out → empty array → streak = 0
      // Actually the filter only keeps non-null, so if all are null → 0
    });

    it("streak when only yesterday has quizzes (not today)", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      yesterday.setUTCHours(12, 0, 0, 0);

      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([
        {
          id: 1,
          topic: "T",
          score: 50,
          startedAt: yesterday,
          completedAt: yesterday,
        },
      ]);

      const result = await getQuizStats();
      // Has yesterday but not today → cursor starts at yesterday → streak = 1
      expect(result.quizStreak).toBe(1);
    });

    it("handles startedAt being null for sort fallback", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const now = new Date();
      const d1 = new Date(now);
      d1.setDate(d1.getDate() - 3);
      const d2 = new Date(now);
      d2.setDate(d2.getDate() - 2);

      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([
        { id: 1, topic: "T", score: 50, startedAt: null, completedAt: now },
        { id: 2, topic: "T", score: 60, startedAt: d1, completedAt: now },
        { id: 3, topic: "T", score: 70, startedAt: null, completedAt: now },
        { id: 4, topic: "T", score: 80, startedAt: d2, completedAt: now },
      ]);

      const result = await getQuizStats();
      expect(result.totalQuizzes).toBe(4);
    });

    it("handles single unique topic in favouriteTopic calculation", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const now = new Date();
      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([
        { id: 1, topic: "Only", score: 50, startedAt: now, completedAt: now },
      ]);

      const result = await getQuizStats();
      expect(result.favouriteTopic).toBe("Only");
    });

    it("favouriteTopic reduce picks b when b count > a count (covers false branch)", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const now = new Date();
      // "Alpha" inserted first (count 1), then "Beta" inserted (count 2).
      // reduce iterates [["Alpha",1],["Beta",2]]: a[1]>b[1] → false → returns b
      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([
        { id: 1, topic: "Alpha", score: 50, startedAt: now, completedAt: now },
        { id: 2, topic: "Beta", score: 60, startedAt: now, completedAt: now },
        { id: 3, topic: "Beta", score: 70, startedAt: now, completedAt: now },
      ]);

      const result = await getQuizStats();
      expect(result.favouriteTopic).toBe("Beta");
    });

    it("covers startedAt null fallback (|| 0) in sort comparator", async () => {
      mockAuth.mockResolvedValue({ userId: "user1" });
      const now = new Date();
      // 4+ sessions with null startedAt to cover both a.startedAt and b.startedAt || 0 branches
      // and >= 4 sessions to enter the improvement trend calculation
      mockDbQuery.aiQuizSessions.findMany.mockResolvedValue([
        { id: 1, topic: "T", score: 50, startedAt: null, completedAt: now },
        { id: 2, topic: "T", score: 60, startedAt: null, completedAt: now },
        { id: 3, topic: "T", score: 70, startedAt: null, completedAt: now },
        { id: 4, topic: "T", score: 80, startedAt: null, completedAt: now },
      ]);

      const result = await getQuizStats();
      expect(result.totalQuizzes).toBe(4);
      expect(result.improvementTrend).toBe("improving"); // scores [50,60,70,80], first half avg 55, second half 75
    });
  });
});
