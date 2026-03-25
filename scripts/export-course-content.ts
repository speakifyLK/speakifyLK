import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Storage } from "@google-cloud/storage";
import pLimit from "p-limit";
import db from "@/db/drizzle";
import { courses, units, lessons } from "@/db/schema";
import { eq } from "drizzle-orm";

// Parse GCS Credentials from .env string
const gcsKeyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

if (!gcsKeyString) {
  console.error("GOOGLE_SERVICE_ACCOUNT_KEY is missing in .env");
  process.exit(1);
}

let credentials;
try {
  credentials = JSON.parse(gcsKeyString);
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }
} catch (e) {
  console.error(
    "Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON string. Check your .env formatting."
  );
  process.exit(1);
}

// Initialize GCS Client with direct credentials
const storage = new Storage({
  credentials,
  projectId: credentials.project_id,
});

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || "speakifylk-rag-content";
const limit = pLimit(5);

//Create an MD5 hash to compare content with GCS

const getHash = (content: string) => crypto.createHash("md5").update(content).digest("hex");

//Transforms lesson data into structured text chunks.

const formatContent = (course: any, unit: any, lesson: any) => {
  return `
    Course: ${course.title}
    Unit: ${unit.title}
    Lesson: ${lesson.title}
    Content: ${lesson.content || "No detailed content provided."}
  `.trim();
};

async function uploadToGCS(fileName: string, content: string) {
  const destFileName = `rag-content/${fileName}`;
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(destFileName);

  try {
    const [exists] = await file.exists();
    if (exists) {
      const [metadata] = await file.getMetadata();
      const localHash = getHash(content);
      // GCS metadata hash is base64 encoded
      const remoteHashBase64 = metadata.md5Hash;
      const localHashBase64 = Buffer.from(localHash, "hex").toString("base64");

      if (remoteHashBase64 === localHashBase64) {
        return "skipped";
      }
    }

    await file.save(content, {
      contentType: "application/json",
      resumable: false,
    });
    return "uploaded";
  } catch (error) {
    console.error(`Error processing ${fileName}:`, error);
    return "failed";
  }
}

async function exportContent() {
  const isDryRun = process.argv.includes("--dry-run");
  const outputDir = path.join(process.cwd(), "tmp", "rag-content");

  const stats = { generated: 0, uploaded: 0, skipped: 0, failed: 0 };
  let totalSize = 0;

  console.log("🚀 Starting Speakify Content Export & GCS Upload...");

  try {
    if (!isDryRun && !fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const allCourses = await db.select().from(courses);
    const tasks: Promise<void>[] = [];

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
            // Write Local File
            fs.writeFileSync(filePath, jsonContent);
            totalSize += Buffer.byteLength(jsonContent);

            // Queue GCS Upload with concurrency limit
            tasks.push(
              limit(async () => {
                const result = await uploadToGCS(fileName, jsonContent);
                stats[result as keyof typeof stats]++;
                console.log(`[${result.toUpperCase()}] ${fileName}`);
              })
            );
          } else {
            console.log(`[DRY-RUN] Would generate and upload: ${fileName}`);
          }
          stats.generated++;
        }
      }
    }

    await Promise.all(tasks);

    // Summary Report
    console.log("\n Process Complete");
    console.log(`-------------------`);
    console.log(`Lessons Processed: ${stats.generated}`);

    if (!isDryRun) {
      console.log(`Files Uploaded:    ${stats.uploaded}`);
      console.log(`Files Skipped:     ${stats.skipped}`);
      console.log(`Files Failed:      ${stats.failed}`);
      console.log(`Total Local Size:  ${(totalSize / 1024).toFixed(2)} KB`);
    } else {
      console.log("This was a dry run. No actions were taken.");
    }
  } catch (error) {
    console.error("Process Failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

exportContent();
