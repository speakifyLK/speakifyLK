import fs from "fs";
import path from "path";
import db from "@/db/drizzle";
import { courses, units, lessons } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Formatter: Transforms lesson data into structured text chunks.
 * This is crucial AI Tutor to understand the context.
 */
const formatContent = (course: any, unit: any, lesson: any) => {
  return `
    Course: ${course.title}
    Unit: ${unit.title}
    Lesson: ${lesson.title}
    Content: ${lesson.content || "No detailed content provided."}
  `.trim();
};

async function exportContent() {
  const isDryRun = process.argv.includes("--dry-run");
  const outputDir = path.join(process.cwd(), "tmp", "rag-content");

  let totalFiles = 0;
  let totalSize = 0;

  console.log("Starting Speakify Content Export...");

  try {
    if (!isDryRun && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. Fetch all Courses from Neon DB
    const allCourses = await db.select().from(courses);

    for (const course of allCourses) {
      const allUnits = await db.select().from(units).where(eq(units.courseId, course.id));

      for (const unit of allUnits) {
        const allLessons = await db.select().from(lessons).where(eq(lessons.unitId, unit.id));

        for (const lesson of allLessons) {
          const formattedText = formatContent(course, unit, lesson);
          const fileName = `course-${course.id}_unit-${unit.id}_lesson-${lesson.id}.json`;
          const filePath = path.join(outputDir, fileName);

          const payload = {
            metadata: {
              courseId: course.id,
              unitId: unit.id,
              lessonId: lesson.id,
              title: lesson.title,
            },
            content: formattedText,
          };

          const jsonContent = JSON.stringify(payload, null, 2);

          if (!isDryRun) {
            fs.writeFileSync(filePath, jsonContent);
            totalSize += Buffer.byteLength(jsonContent);
          } else {
            console.log(`[DRY-RUN] Would generate: ${fileName}`);
          }

          totalFiles++;
        }
      }
    }

    // 2. Summary Report
    console.log("\nExport Complete");
    console.log(`-------------------`);
    console.log(`Files Generated: ${totalFiles}`);
    if (!isDryRun) {
      console.log(`Total Size: ${(totalSize / 1024).toFixed(2)} KB`);
      console.log(`Directory: ${outputDir}`);
    } else {
      console.log("Note: This was a dry run. No files were written to disk.");
    }
  } catch (error) {
    console.error("Export Failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

exportContent();
