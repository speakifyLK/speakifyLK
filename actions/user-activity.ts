"use server";

import { auth } from "@clerk/nextjs/server";
import { sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { userActivity } from "@/db/schema";

/**
 * Records or increments daily activity for the authenticated user.
 * Called after completing a lesson challenge or an AI quiz.
 *
 * Uses a single INSERT … ON CONFLICT DO UPDATE statement so the
 * operation is atomic – no race conditions or duplicate rows.
 */
export const recordDailyActivity = async (opts: {
  lessonsCompleted?: number;
  quizzesCompleted?: number;
  xpEarned?: number;
}) => {
  const { userId } = await auth();
  if (!userId) return;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC

  await db
    .insert(userActivity)
    .values({
      userId,
      date: today,
      lessonsCompleted: opts.lessonsCompleted ?? 0,
      quizzesCompleted: opts.quizzesCompleted ?? 0,
      xpEarned: opts.xpEarned ?? 0,
    })
    .onConflictDoUpdate({
      target: [userActivity.userId, userActivity.date],
      set: {
        lessonsCompleted: sql`${userActivity.lessonsCompleted} + ${opts.lessonsCompleted ?? 0}`,
        quizzesCompleted: sql`${userActivity.quizzesCompleted} + ${opts.quizzesCompleted ?? 0}`,
        xpEarned: sql`${userActivity.xpEarned} + ${opts.xpEarned ?? 0}`,
        updatedAt: sql`now()`,
      },
    });
};
