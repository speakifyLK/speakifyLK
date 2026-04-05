/**
 * Export course content from the database to local JSON files and upload to GCS.
 *
 * Queries all courses, units, and lessons from the database, formats them into
 * structured JSON chunks, writes them locally to tmp/rag-content/, and uploads
 * to a GCS bucket for RAG ingestion.
 *
 * Required env:
 *   GOOGLE_SERVICE_ACCOUNT_KEY  — GCP service account JSON key
 *   DATABASE_URL                — Neon PostgreSQL connection string
 *
 * Optional env:
 *   RAG_CONTENT_BUCKET  — GCS bucket name (default: speakifylk-rag-content)
 *   GCS_BUCKET_NAME     — Alias for RAG_CONTENT_BUCKET
 *
 * Usage:
 *   bun scripts/export-course-content.ts              # Export and upload
 *   bun scripts/export-course-content.ts --dry-run    # Preview without writing
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as dotenv from "dotenv";
import { Storage } from "@google-cloud/storage";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });
import pLimit from "p-limit";
import db from "@/db/drizzle";

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

const BUCKET_NAME =
  process.env.RAG_CONTENT_BUCKET || process.env.GCS_BUCKET_NAME || "speakifylk-rag-content";
const limit = pLimit(5);

//Create an MD5 hash to compare content with GCS

const getHash = (content: string) => crypto.createHash("md5").update(content).digest("hex");

const formatContent = (course: any, unit: any, lesson: any) => {
  let contentText = "";
  if (lesson.challenges && lesson.challenges.length > 0) {
    const challengeTexts = lesson.challenges.map((c: any) => {
      let text = `Challenge: ${c.question} (Type: ${c.type})`;
      if (c.challengeOptions && c.challengeOptions.length > 0) {
        const optionsText = c.challengeOptions
          .map((opt: any) => `  - ${opt.text} ${opt.correct ? "(Correct Answer)" : ""}`)
          .join("\n");
        text += `\nOptions:\n${optionsText}`;
      }
      return text;
    });
    contentText = challengeTexts.join("\n\n");
  } else {
    contentText = "No detailed content provided.";
  }

  return `
Course: ${course.title}
Unit: ${unit.title}
Lesson: ${lesson.title}

--- Lesson Content ---
${contentText}
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

    const courseStructure = await db.query.courses.findMany({
      orderBy: (courses, { asc }) => [asc(courses.id)],
      with: {
        units: {
          orderBy: (units, { asc }) => [asc(units.order)],
          with: {
            lessons: {
              orderBy: (lessons, { asc }) => [asc(lessons.order)],
              with: {
                challenges: {
                  orderBy: (challenges, { asc }) => [asc(challenges.order)],
                  with: {
                    challengeOptions: {
                      orderBy: (challengeOptions, { asc }) => [asc(challengeOptions.id)],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    
    const tasks: Promise<void>[] = [];

    for (const course of courseStructure) {
      for (const unit of course.units) {
        for (const lesson of unit.lessons) {
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
