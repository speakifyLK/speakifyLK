"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { userActivity } from "@/db/schema";

/**
 * Records or increments daily activity for the authenticated user.
 * Called after completing a lesson challenge or an AI quiz.
 *
 * Uses "upsert-like" logic: if a row already exists for today,
 * increment the counters; otherwise insert a new row.
 */
export const recordDailyActivity = async (opts: {
  lessonsCompleted?: number;
  quizzesCompleted?: number;
  xpEarned?: number;
}) => {
  const { userId } = await auth();
  if (!userId) return;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC

  const existing = await db.query.userActivity.findFirst({
    where: and(eq(userActivity.userId, userId), eq(userActivity.date, today)),
  });

  if (existing) {
    await db
      .update(userActivity)
      .set({
        lessonsCompleted: existing.lessonsCompleted + (opts.lessonsCompleted ?? 0),
        quizzesCompleted: existing.quizzesCompleted + (opts.quizzesCompleted ?? 0),
        xpEarned: existing.xpEarned + (opts.xpEarned ?? 0),
      })
      .where(eq(userActivity.id, existing.id));
  } else {
    await db.insert(userActivity).values({
      userId,
      date: today,
      lessonsCompleted: opts.lessonsCompleted ?? 0,
      quizzesCompleted: opts.quizzesCompleted ?? 0,
      xpEarned: opts.xpEarned ?? 0,
    });
  }
};
