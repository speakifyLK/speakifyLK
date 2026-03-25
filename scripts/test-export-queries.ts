import * as dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

async function main() {
  console.log("🔍 Testing export query functions...\n");

  const {
    getAllChallengesWithOptions,
    getAllLessonsWithContext,
    getCourseStructure,
  } = await import("../db/export-queries");

  // --- 1. getAllChallengesWithOptions ---
  console.log("━".repeat(60));
  console.log("1️⃣  getAllChallengesWithOptions()");
  console.log("━".repeat(60));
  const challengesByLesson = await getAllChallengesWithOptions();
  console.log(`   Lessons returned: ${challengesByLesson.length}`);
  for (const lesson of challengesByLesson.slice(0, 2)) {
    console.log(`   📘 Lesson "${lesson.title}" – ${lesson.challenges.length} challenges`);
    for (const ch of lesson.challenges.slice(0, 2)) {
      console.log(`      ❓ [${ch.type}] "${ch.question}" – ${ch.challengeOptions.length} options`);
    }
  }
  console.log();

  // --- 2. getAllLessonsWithContext ---
  console.log("━".repeat(60));
  console.log("2️⃣  getAllLessonsWithContext()");
  console.log("━".repeat(60));
  const lessonsWithContext = await getAllLessonsWithContext();
  console.log(`   Lessons returned: ${lessonsWithContext.length}`);
  for (const lesson of lessonsWithContext.slice(0, 3)) {
    console.log(
      `   📘 "${lesson.title}" → Unit: "${lesson.unit.title}" → Course: "${lesson.unit.course.title}"`
    );
  }
  console.log();

  // --- 3. getCourseStructure ---
  console.log("━".repeat(60));
  console.log("3️⃣  getCourseStructure()");
  console.log("━".repeat(60));
  const structure = await getCourseStructure();
  console.log(`   Courses returned: ${structure.length}`);
  for (const course of structure) {
    console.log(`   🎓 Course: "${course.title}" – ${course.units.length} units`);
    for (const unit of course.units.slice(0, 2)) {
      console.log(`      📦 Unit: "${unit.title}" – ${unit.lessons.length} lessons`);
      for (const lesson of unit.lessons.slice(0, 2)) {
        console.log(`         📘 Lesson: "${lesson.title}" – ${lesson.challenges.length} challenges`);
      }
    }
  }

  console.log("\n✅ All export queries executed successfully!");
}

main().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
