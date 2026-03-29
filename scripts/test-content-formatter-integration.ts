/**
 * Integration test: verifies that content-formatter types are compatible
 * with the actual DB schema types returned by Drizzle queries.
 *
 * This script connects to the real database, fetches one course with its
 * full hierarchy, and passes the data through all three formatter functions.
 *
 * Usage: npx tsx ./scripts/test-content-formatter-integration.ts
 *
 * Requires: DATABASE_URL in .env / .env.local
 */

import * as dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

import db from "../db/drizzle";
import { courses, units, lessons, challenges, challengeOptions } from "../db/schema";
import { eq, asc } from "drizzle-orm";

import {
  formatChallengeChunk,
  formatLessonChunk,
  formatCourseManifest,
  type ChallengeOption,
  type ChallengeInput,
  type LessonContext,
  type LessonInput,
  type CourseInput,
  type UnitInput,
} from "../lib/content-formatter";

async function main() {
  console.log("Fetching first course from DB...\n");

  // 1. Get a course
  const course = await db.query.courses.findFirst();
  if (!course) {
    console.log("No courses found in DB. Skipping integration test.");
    process.exit(0);
  }
  console.log(`Course: ${course.title} (id=${course.id})`);

  // 2. Get all units for this course
  const courseUnits = await db.query.units.findMany({
    where: eq(units.courseId, course.id),
    orderBy: [asc(units.order)],
  });
  console.log(`  Units: ${courseUnits.length}`);

  // 3. Build CourseInput and test formatCourseManifest
  const unitInputs: UnitInput[] = [];

  for (const unit of courseUnits) {
    const unitLessons = await db.query.lessons.findMany({
      where: eq(lessons.unitId, unit.id),
      orderBy: [asc(lessons.order)],
    });

    unitInputs.push({
      title: unit.title,
      description: unit.description,
      order: unit.order,
      lessons: unitLessons.map((l) => ({ title: l.title, order: l.order })),
    });
  }

  const courseInput: CourseInput = { title: course.title, units: unitInputs };
  const manifest = formatCourseManifest(courseInput);
  console.log("\n━━━ Course Manifest ━━━");
  console.log(manifest);

  // 4. Test formatLessonChunk + formatChallengeChunk with the first lesson that has challenges
  for (const unit of courseUnits) {
    const unitLessons = await db.query.lessons.findMany({
      where: eq(lessons.unitId, unit.id),
      orderBy: [asc(lessons.order)],
    });

    for (const lesson of unitLessons) {
      const lessonChallenges = await db.query.challenges.findMany({
        where: eq(challenges.lessonId, lesson.id),
        orderBy: [asc(challenges.order)],
      });

      if (lessonChallenges.length === 0) continue;

      const context: LessonContext = {
        courseName: course.title,
        unitTitle: unit.title,
        lessonTitle: lesson.title,
      };

      // Build challenge-with-options array
      const challengesWithOptions = [];
      for (const ch of lessonChallenges) {
        const opts = await db.query.challengeOptions.findMany({
          where: eq(challengeOptions.challengeId, ch.id),
        });

        // Map DB types to formatter types
        const formatterOpts: ChallengeOption[] = opts.map((o) => ({
          text: o.text,
          correct: o.correct,
          imageSrc: o.imageSrc,
          audioSrc: o.audioSrc,
        }));

        const formatterChallenge: ChallengeInput = {
          question: ch.question,
          type: ch.type,
          order: ch.order,
        };

        challengesWithOptions.push({
          challenge: formatterChallenge,
          options: formatterOpts,
        });
      }

      // Test single challenge chunk
      console.log("\n━━━ Single Challenge Chunk ━━━");
      const firstChallenge = challengesWithOptions[0];
      console.log(
        formatChallengeChunk(firstChallenge.challenge, firstChallenge.options, context)
      );

      // Test full lesson chunk
      const lessonInput: LessonInput = { title: lesson.title, order: lesson.order };
      console.log("\n━━━ Full Lesson Chunk ━━━");
      console.log(
        formatLessonChunk(lessonInput, challengesWithOptions, {
          courseName: context.courseName,
          unitTitle: context.unitTitle,
        })
      );

      console.log("\n✅ Integration test passed — DB types are compatible with formatter types!");
      process.exit(0);
    }
  }

  console.log("\n⚠️  No lessons with challenges found. Type compatibility verified via manifest only.");
  process.exit(0);
}

void (async () => {
  try {
    await main();
  } catch (e) {
    console.error("❌ Integration test failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
})();
