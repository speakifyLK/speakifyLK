import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { MAX_HEARTS } from "@/constants";

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageSrc: text("image_src").notNull(),
});

export const coursesRelations = relations(courses, ({ many }) => ({
  userProgress: many(userProgress),
  units: many(units),
  aiQuizSessions: many(aiQuizSessions),
}));

export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // Unit 1
  description: text("description").notNull(), // Learn the basics of spanish
  courseId: integer("course_id")
    .references(() => courses.id, {
      onDelete: "cascade",
    })
    .notNull(),
  order: integer("order").notNull(),
});

export const unitsRelations = relations(units, ({ many, one }) => ({
  course: one(courses, {
    fields: [units.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
}));

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  unitId: integer("unit_id")
    .references(() => units.id, {
      onDelete: "cascade",
    })
    .notNull(),
  order: integer("order").notNull(),
});

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  unit: one(units, {
    fields: [lessons.unitId],
    references: [units.id],
  }),
  challenges: many(challenges),
}));

export const challengesEnum = pgEnum("type", ["SELECT", "ASSIST"]);

export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id")
    .references(() => lessons.id, {
      onDelete: "cascade",
    })
    .notNull(),
  type: challengesEnum("type").notNull(),
  question: text("question").notNull(),
  order: integer("order").notNull(),
});

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [challenges.lessonId],
    references: [lessons.id],
  }),
  challengeOptions: many(challengeOptions),
  challengeProgress: many(challengeProgress),
}));

export const challengeOptions = pgTable("challenge_options", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id")
    .references(() => challenges.id, {
      onDelete: "cascade",
    })
    .notNull(),
  text: text("text").notNull(),
  correct: boolean("correct").notNull(),
  imageSrc: text("image_src"),
  audioSrc: text("audio_src"),
});

export const challengeOptionsRelations = relations(challengeOptions, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeOptions.challengeId],
    references: [challenges.id],
  }),
}));

export const challengeProgress = pgTable("challenge_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  challengeId: integer("challenge_id")
    .references(() => challenges.id, {
      onDelete: "cascade",
    })
    .notNull(),
  completed: boolean("completed").notNull().default(false),
});

export const challengeProgressRelations = relations(challengeProgress, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeProgress.challengeId],
    references: [challenges.id],
  }),
}));

export const userProgress = pgTable("user_progress", {
  userId: text("user_id").primaryKey(),
  userName: text("user_name").notNull().default("User"),
  userImageSrc: text("user_image_src").notNull().default("/mascot.svg"),
  activeCourseId: integer("active_course_id").references(() => courses.id, {
    onDelete: "cascade",
  }),
  hearts: integer("hearts").notNull().default(MAX_HEARTS),
  points: integer("points").notNull().default(0),
});

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  activeCourse: one(courses, {
    fields: [userProgress.activeCourseId],
    references: [courses.id],
  }),
}));

export const userSubscription = pgTable("user_subscription", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripePriceId: text("stripe_price_id").notNull(),
  stripeCurrentPeriodEnd: timestamp("stripe_current_period_end").notNull(),
});

// ── Chatbot ──────────────────────────────────────────────────────────

export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant"]);

export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull().default("New Conversation"),
  language: text("language").notNull().default("sinhala"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const chatConversationsRelations = relations(chatConversations, ({ many }) => ({
  messages: many(chatMessages),
}));

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .references(() => chatConversations.id, { onDelete: "cascade" })
    .notNull(),
  role: chatRoleEnum("role").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
}));

// ── AI Quiz ──────────────────────────────────────────────────────────

export const quizDifficultyEnum = pgEnum("quiz_difficulty", [
  "beginner",
  "intermediate",
  "advanced",
]);

export const quizQuestionTypeEnum = pgEnum("quiz_question_type", [
  "mcq",
  "fill_blank",
  "translation",
]);

/** Optional JSON payload on AI quiz sessions (e.g. RAG retrieval trace). */
export type AiQuizSessionMetadata = {
  rag?: {
    provider: "vertex_rag_retrieveContexts";
    chunkCount: number;
    chunkSources: Array<{ source: string; score: number }>;
    /** True when generation used retrieved chunks in the prompt for at least one type. */
    groundedGeneration: boolean;
  };
};

export const aiQuizSessions = pgTable("ai_quiz_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  topic: text("topic").notNull(),
  difficulty: quizDifficultyEnum("difficulty").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull().default(0),
  score: integer("score").notNull().default(0),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  courseId: integer("course_id")
    .references(() => courses.id, { onDelete: "cascade" })
    .notNull(),
  ragGrounded: boolean("rag_grounded").notNull().default(false),
  metadata: json("metadata").$type<AiQuizSessionMetadata | null>(),
});

export const aiQuizSessionsRelations = relations(aiQuizSessions, ({ one, many }) => ({
  course: one(courses, {
    fields: [aiQuizSessions.courseId],
    references: [courses.id],
  }),
  questions: many(aiQuizQuestions),
}));

export const aiQuizQuestions = pgTable("ai_quiz_questions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .references(() => aiQuizSessions.id, { onDelete: "cascade" })
    .notNull(),
  type: quizQuestionTypeEnum("type").notNull(),
  question: text("question").notNull(),
  options: json("options"),
  correctAnswer: text("correct_answer").notNull(),
  userAnswer: text("user_answer"),
  isCorrect: boolean("is_correct"),
  explanation: text("explanation").notNull(),
  order: integer("order").notNull(),
});

export const aiQuizQuestionsRelations = relations(aiQuizQuestions, ({ one }) => ({
  session: one(aiQuizSessions, {
    fields: [aiQuizQuestions.sessionId],
    references: [aiQuizSessions.id],
  }),
}));

// ── User Activity (streak tracking) ─────────────────────────────────

export const userActivity = pgTable("user_activity", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  /** UTC calendar date string (YYYY-MM-DD) – one row per user per day */
  date: text("date").notNull(),
  /** Number of lessons / challenges completed that day */
  lessonsCompleted: integer("lessons_completed").notNull().default(0),
  /** Number of AI quizzes completed that day */
  quizzesCompleted: integer("quizzes_completed").notNull().default(0),
  /** Total XP earned that day */
  xpEarned: integer("xp_earned").notNull().default(0),
  /** Timestamp of the first activity that day */
  createdAt: timestamp("created_at").defaultNow().notNull(),
  /** Timestamp of the latest activity that day */
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
