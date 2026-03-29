/**
 * Verification script for lib/content-formatter.ts
 *
 * Usage: npx tsx ./scripts/test-content-formatter.ts
 */

import {
  formatChallengeChunk,
  formatLessonChunk,
  formatCourseManifest,
  type ChallengeInput,
  type ChallengeOption,
  type LessonInput,
  type CourseInput,
} from "../lib/content-formatter";

// ── Helpers ──────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    failed++;
  }
}

// ── Mock Data ────────────────────────────────────────────────────────

const challenge: ChallengeInput = {
  question: 'Which word means "hello"?',
  type: "SELECT",
  order: 1,
  courseName: "Sinhala",
  unitTitle: "Unit 1 – Greetings",
  lessonTitle: "Basic Greetings",
};

const options: ChallengeOption[] = [
  { text: "ආයුබෝවන්", correct: true },
  { text: "ස්තූතියි", correct: false },
  { text: "ආයිත එන්නම්", correct: false },
];

const lesson: LessonInput = {
  title: "Basic Greetings",
  order: 1,
  courseName: "Sinhala",
  unitTitle: "Unit 1 – Greetings",
};

const challengesWithOptions = [
  { challenge, options },
  {
    challenge: { question: 'Translate "thank you"', type: "ASSIST" as const, order: 2 },
    options: [
      { text: "ස්තූතියි", correct: true },
      { text: "ආයුබෝවන්", correct: false },
    ],
  },
];

const course: CourseInput = {
  title: "Sinhala",
  units: [
    {
      title: "Unit 1 – Greetings",
      description: "Learn basic Sinhala greetings",
      order: 1,
      lessons: [
        { title: "Basic Greetings", order: 1 },
        { title: "Formal Greetings", order: 2 },
      ],
    },
    {
      title: "Unit 2 – Numbers",
      description: "Learn Sinhala numbers 1-20",
      order: 2,
      lessons: [
        { title: "Numbers 1-10", order: 1 },
        { title: "Numbers 11-20", order: 2 },
      ],
    },
  ],
};

// ── Test: formatChallengeChunk ───────────────────────────────────────

console.log("\n━━━ formatChallengeChunk ━━━");
const chunkOutput = formatChallengeChunk(challenge, options);
console.log(chunkOutput);
console.log("");

assert(chunkOutput.includes("=== METADATA ==="), "Contains METADATA header");
assert(chunkOutput.includes("=== CONTENT ==="), "Contains CONTENT header");
assert(chunkOutput.includes("Course: Sinhala"), "Contains course name");
assert(chunkOutput.includes("Unit: Unit 1 – Greetings"), "Contains unit title");
assert(chunkOutput.includes("Lesson: Basic Greetings"), "Contains lesson title");
assert(chunkOutput.includes("Challenge Type: SELECT"), "Contains challenge type");
assert(chunkOutput.includes('Question: Which word means "hello"?'), "Contains question");
assert(chunkOutput.includes("ආයුබෝවන් ✅"), "Marks correct option");
assert(chunkOutput.includes("Correct Answer: ආයුබෝවන්"), "Shows correct answer");

// ── Test: formatLessonChunk ──────────────────────────────────────────

console.log("\n━━━ formatLessonChunk ━━━");
const lessonOutput = formatLessonChunk(lesson, challengesWithOptions);
console.log(lessonOutput);
console.log("");

assert(lessonOutput.includes("=== METADATA ==="), "Contains METADATA header");
assert(lessonOutput.includes("Total Challenges: 2"), "Shows total challenges");
assert(lessonOutput.includes("Challenge 1 of 2 (SELECT)"), "Challenge 1 header");
assert(lessonOutput.includes("Challenge 2 of 2 (ASSIST)"), "Challenge 2 header");
assert(lessonOutput.includes("Lesson: Basic Greetings (Lesson 1)"), "Lesson with order");
assert(lessonOutput.includes("Challenge Types: SELECT, ASSIST"), "Shows unique challenge types");

// ── Test: formatCourseManifest ───────────────────────────────────────

console.log("\n━━━ formatCourseManifest ━━━");
const manifestOutput = formatCourseManifest(course);
console.log(manifestOutput);
console.log("");

assert(manifestOutput.includes("=== COURSE MANIFEST ==="), "Contains MANIFEST header");
assert(manifestOutput.includes("Course: Sinhala"), "Contains course name");
assert(manifestOutput.includes("Unit 1: Unit 1 – Greetings"), "Contains unit 1");
assert(manifestOutput.includes("Unit 2: Unit 2 – Numbers"), "Contains unit 2");
assert(manifestOutput.includes("Description: Learn basic Sinhala greetings"), "Unit 1 description");
assert(manifestOutput.includes("1. Basic Greetings"), "Lesson 1 listed");
assert(manifestOutput.includes("2. Numbers 11-20"), "Lesson from unit 2 listed");

// ── Edge case: empty lesson ──────────────────────────────────────────

console.log("\n━━━ Edge: empty lesson ━━━");
const emptyLesson = formatLessonChunk(
  {
    title: "Empty Lesson",
    order: 5,
    courseName: "Sinhala",
    unitTitle: "Unit 3",
  },
  []
);
console.log(emptyLesson);
console.log("");
assert(emptyLesson.includes("Total Challenges: 0"), "Shows zero challenges");
assert(emptyLesson.includes("No challenges available"), "Shows empty message");

// ── Edge case: empty course ──────────────────────────────────────────

console.log("\n━━━ Edge: empty course ━━━");
const emptyCourse = formatCourseManifest({ title: "Empty Course", units: [] });
console.log(emptyCourse);
console.log("");
assert(emptyCourse.includes("No units available"), "Shows empty units message");

// ── Summary ──────────────────────────────────────────────────────────

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log("All tests passed! ✅\n");
