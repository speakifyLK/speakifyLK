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
import { units, lessons, challenges, challengeOptions } from "../db/schema";
import { eq, asc } from "drizzle-orm";

import {
  formatChallengeChunk,
  formatLessonChunk,
  formatCourseManifest,
  type ChallengeOption,
  type ChallengeInput,
  type LessonInput,
  type CourseInput,
  type UnitInput,
} from "../lib/content-formatter";

async function main() {
  console.log("Fetching first course from DB with all relations...\n");

  // 1. Get a course with its entire hierarchy in ONE query
  const course = await db.query.courses.findFirst({
    with: {
      units: {
        orderBy: [asc(units.order)],
        with: {
          lessons: {
            orderBy: [asc(lessons.order)],
            with: {
              challenges: {
                orderBy: [asc(challenges.order)],
                with: {
                  challengeOptions: {
                    orderBy: [asc(challengeOptions.id)],
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    console.log("No courses found in DB. Skipping integration test.");
    process.exit(0);
  }
  console.log(`Course: ${course.title} (id=${course.id})`);
  console.log(`  Units: ${course.units.length}`);

  // 2. Build CourseInput and test formatCourseManifest
  const unitInputs: UnitInput[] = course.units.map((unit) => ({
    title: unit.title,
    description: unit.description,
    order: unit.order,
    lessons: unit.lessons.map((l) => ({ title: l.title, order: l.order })),
  }));

  const courseInput: CourseInput = { title: course.title, units: unitInputs };
  const manifest = formatCourseManifest(courseInput);
  console.log("\n━━━ Course Manifest ━━━");
  console.log(manifest);

  // 3. Test formatLessonChunk + formatChallengeChunk with the first lesson that has challenges
  for (const unit of course.units) {
    for (const lesson of unit.lessons) {
      if (lesson.challenges.length === 0) continue;

      // Build challenge-with-options array
      const challengesWithOptions: { challenge: ChallengeInput; options: ChallengeOption[] }[] = lesson.challenges.map((ch) => ({
        challenge: {
          question: ch.question,
          type: ch.type,
          order: ch.order,
          courseName: course.title,
          unitTitle: unit.title,
          lessonTitle: lesson.title,
        },
        options: ch.challengeOptions.map((o) => ({
          text: o.text,
          correct: o.correct,
          imageSrc: o.imageSrc,
          audioSrc: o.audioSrc,
        })),
      }));

      // Test single challenge chunk
      console.log("\n━━━ Single Challenge Chunk ━━━");
      const firstChallenge = challengesWithOptions[0];
      console.log(formatChallengeChunk(firstChallenge.challenge, firstChallenge.options));

      // Test full lesson chunk
      const lessonInput: LessonInput = {
        title: lesson.title,
        order: lesson.order,
        courseName: course.title,
        unitTitle: unit.title,
      };
      console.log("\n━━━ Full Lesson Chunk ━━━");
      console.log(formatLessonChunk(lessonInput, challengesWithOptions));

      console.log("\n✅ Integration test passed — DB types are compatible with formatter types!");
      process.exit(0);
    }
  }

  console.log(
    "\n⚠️  No lessons with challenges found. Type compatibility verified via manifest only."
  );
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
