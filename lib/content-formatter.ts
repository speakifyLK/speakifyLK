/**
 * RAG Content Chunking Formatter
 *
 * Transforms raw database records (courses, units, lessons, challenges, options)
 * into structured text chunks suitable for Vertex AI RAG ingestion.
 *
 * These functions are pure — they accept plain objects and return strings,
 * with no database or framework dependency.
 */

// ── Input Types ──────────────────────────────────────────────────────

export interface ChallengeOption {
  text: string;
  correct: boolean;
  imageSrc?: string | null;
  audioSrc?: string | null;
}

export interface ChallengeInput {
  question: string;
  type: "SELECT" | "ASSIST";
  order: number;
}

export interface LessonContext {
  lessonTitle: string;
  unitTitle: string;
  courseName: string;
}

export interface LessonInput {
  title: string;
  order: number;
}

export interface UnitInput {
  title: string;
  description: string;
  order: number;
  lessons: { title: string; order: number }[];
}

export interface CourseInput {
  title: string;
  units: UnitInput[];
}

// ── Challenge-level chunk ────────────────────────────────────────────

/**
 * Formats a single challenge with its options into a structured text chunk.
 *
 * The output contains a metadata header (course / unit / lesson / type) and
 * a content section with the question, all options (correct one marked), and
 * the correct answer called out explicitly.
 */
export function formatChallengeChunk(
  challenge: ChallengeInput,
  options: ChallengeOption[],
  context: LessonContext
): string {
  const correctOption = options.find((o) => o.correct);
  const correctAnswer = correctOption?.text ?? "N/A";

  const optionLines = options.map((o) => `  - ${o.text}${o.correct ? " ✅" : ""}`).join("\n");

  return [
    "=== METADATA ===",
    `Course: ${context.courseName}`,
    `Unit: ${context.unitTitle}`,
    `Lesson: ${context.lessonTitle}`,
    `Challenge Type: ${challenge.type}`,
    "=== CONTENT ===",
    `Question: ${challenge.question}`,
    "",
    "Options:",
    optionLines,
    "",
    `Correct Answer: ${correctAnswer}`,
  ].join("\n");
}

// ── Lesson-level chunk ───────────────────────────────────────────────

interface ChallengeWithOptions {
  challenge: ChallengeInput;
  options: ChallengeOption[];
}

/**
 * Formats an entire lesson with all its challenges into one document.
 *
 * A lesson-level metadata header is followed by each challenge formatted as
 * a numbered sub-section. This produces a single, coherent document per
 * lesson that the RAG system can index.
 */
export function formatLessonChunk(
  lesson: LessonInput,
  challenges: ChallengeWithOptions[],
  context: Omit<LessonContext, "lessonTitle">
): string {
  const total = challenges.length;

  const header = [
    "=== METADATA ===",
    `Course: ${context.courseName}`,
    `Unit: ${context.unitTitle}`,
    `Lesson: ${lesson.title} (Lesson ${lesson.order})`,
    `Total Challenges: ${total}`,
    "=== CONTENT ===",
  ].join("\n");

  if (total === 0) {
    return header + "\n\nNo challenges available for this lesson.";
  }

  const challengeSections = challenges.map((c, idx) => {
    const correctOption = c.options.find((o) => o.correct);
    const correctAnswer = correctOption?.text ?? "N/A";

    const optionLines = c.options.map((o) => `  - ${o.text}${o.correct ? " ✅" : ""}`).join("\n");

    return [
      `--- Challenge ${idx + 1} of ${total} (${c.challenge.type}) ---`,
      `Question: ${c.challenge.question}`,
      "",
      "Options:",
      optionLines,
      "",
      `Correct Answer: ${correctAnswer}`,
    ].join("\n");
  });

  return header + "\n\n" + challengeSections.join("\n\n");
}

// ── Course manifest ──────────────────────────────────────────────────

/**
 * Creates a summary document listing every unit and lesson in a course.
 *
 * This gives the RAG system a high-level map of the course structure so
 * it can contextualise individual lesson chunks.
 */
export function formatCourseManifest(course: CourseInput): string {
  const header = ["=== COURSE MANIFEST ===", `Course: ${course.title}`].join("\n");

  if (course.units.length === 0) {
    return header + "\n\nNo units available for this course.";
  }

  const unitSections = course.units.map((unit) => {
    const lessonLines =
      unit.lessons.length > 0
        ? unit.lessons.map((l) => `    ${l.order}. ${l.title}`).join("\n")
        : "    (no lessons)";

    return [
      `Unit ${unit.order}: ${unit.title}`,
      `  Description: ${unit.description}`,
      "  Lessons:",
      lessonLines,
    ].join("\n");
  });

  return header + "\n\n" + unitSections.join("\n\n");
}
