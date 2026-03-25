/**
 * Export-specific database query functions.
 *
 * ⚠️  These helpers are intended **only** for the offline export script
 * (`scripts/export-course-content.ts` or similar).  They are NOT wrapped
 * with `cache()` or `auth()` because they run outside the Next.js request
 * lifecycle.  Do NOT import this module from app-runtime code.
 */

import db from "./drizzle";

// ---------------------------------------------------------------------------
// 1. getAllChallengesWithOptions
//    Returns every lesson together with its challenges and their options,
//    making it easy to iterate challenges grouped by lesson.
// ---------------------------------------------------------------------------

export async function getAllChallengesWithOptions() {
  const data = await db.query.lessons.findMany({
    orderBy: (lessons, { asc }) => [asc(lessons.order)],
    columns: {
      id: true,
      title: true,
      order: true,
      unitId: true,
    },
    with: {
      challenges: {
        orderBy: (challenges, { asc }) => [asc(challenges.order)],
        with: {
          challengeOptions: true,
        },
      },
    },
  });

  return data;
}

// ---------------------------------------------------------------------------
// 2. getAllLessonsWithContext
//    Returns every lesson alongside its parent unit title and course title
//    so the export script can display full context without extra lookups.
// ---------------------------------------------------------------------------

export async function getAllLessonsWithContext() {
  const data = await db.query.lessons.findMany({
    orderBy: (lessons, { asc }) => [asc(lessons.order)],
    with: {
      unit: {
        columns: {
          id: true,
          title: true,
          order: true,
        },
        with: {
          course: {
            columns: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  return data;
}

// ---------------------------------------------------------------------------
// 3. getCourseStructure
//    Returns the full course hierarchy:
//    courses -> units -> lessons -> challenges
// ---------------------------------------------------------------------------

export async function getCourseStructure() {
  const data = await db.query.courses.findMany({
    with: {
      units: {
        orderBy: (units, { asc }) => [asc(units.order)],
        with: {
          lessons: {
            orderBy: (lessons, { asc }) => [asc(lessons.order)],
            with: {
              challenges: {
                orderBy: (challenges, { asc }) => [asc(challenges.order)],
              },
            },
          },
        },
      },
    },
  });

  return data;
}
