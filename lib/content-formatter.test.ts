import { describe, it, expect } from "vitest";
import {
  formatChallengeChunk,
  formatLessonChunk,
  formatCourseManifest,
} from "./content-formatter";

// ═══════════════════════════════════════════════════════════════════════
// formatChallengeChunk
// ═══════════════════════════════════════════════════════════════════════

describe("formatChallengeChunk", () => {
  it("includes metadata header with course, unit, and lesson", () => {
    const result = formatChallengeChunk(
      {
        question: "What is 'cat'?",
        type: "SELECT",
        order: 1,
        courseName: "Sinhala",
        unitTitle: "Animals",
        lessonTitle: "Pets",
      },
      [
        { text: "පූසා", correct: true },
        { text: "බල්ලා", correct: false },
      ]
    );
    expect(result).toContain("Course: Sinhala");
    expect(result).toContain("Unit: Animals");
    expect(result).toContain("Lesson: Pets");
    expect(result).toContain("Challenge Type: SELECT");
  });

  it("marks the correct option with ✅", () => {
    const result = formatChallengeChunk(
      { question: "Q?", type: "SELECT", order: 1 },
      [
        { text: "Right", correct: true },
        { text: "Wrong", correct: false },
      ]
    );
    expect(result).toContain("Right ✅");
    expect(result).not.toContain("Wrong ✅");
  });

  it("shows correct answer in the footer", () => {
    const result = formatChallengeChunk(
      { question: "Q?", type: "SELECT", order: 1 },
      [
        { text: "Answer", correct: true },
        { text: "Other", correct: false },
      ]
    );
    expect(result).toContain("Correct Answer: Answer");
  });

  it("shows N/A when no correct option exists", () => {
    const result = formatChallengeChunk(
      { question: "Q?", type: "SELECT", order: 1 },
      [{ text: "A", correct: false }]
    );
    expect(result).toContain("Correct Answer: N/A");
  });

  it("uses default values for missing course/unit/lesson", () => {
    const result = formatChallengeChunk(
      { question: "Q?", type: "ASSIST", order: 1 },
      [{ text: "A", correct: true }]
    );
    expect(result).toContain("Course: Unknown Course");
    expect(result).toContain("Unit: Unknown Unit");
    expect(result).toContain("Lesson: Unknown Lesson");
  });

  it("handles empty options array", () => {
    const result = formatChallengeChunk(
      { question: "Q?", type: "SELECT", order: 1 },
      []
    );
    expect(result).toContain("Correct Answer: N/A");
    expect(result).toContain("Options:");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// formatLessonChunk
// ═══════════════════════════════════════════════════════════════════════

describe("formatLessonChunk", () => {
  it("includes metadata header for the lesson", () => {
    const result = formatLessonChunk(
      { title: "Greetings", order: 1, courseName: "Sinhala", unitTitle: "Basics" },
      []
    );
    expect(result).toContain("Course: Sinhala");
    expect(result).toContain("Unit: Basics");
    expect(result).toContain("Lesson: Greetings (Lesson 1)");
  });

  it("shows 'No challenges available' for empty challenges", () => {
    const result = formatLessonChunk({ title: "Empty", order: 1 }, []);
    expect(result).toContain("No challenges available");
    expect(result).toContain("Total Challenges: 0");
  });

  it("sorts challenges by order", () => {
    const result = formatLessonChunk({ title: "Lesson", order: 1 }, [
      {
        challenge: { question: "Second", type: "SELECT", order: 2 },
        options: [{ text: "A", correct: true }],
      },
      {
        challenge: { question: "First", type: "SELECT", order: 1 },
        options: [{ text: "B", correct: true }],
      },
    ]);
    const firstIdx = result.indexOf("First");
    const secondIdx = result.indexOf("Second");
    expect(firstIdx).toBeLessThan(secondIdx);
  });

  it("includes challenge type labels", () => {
    const result = formatLessonChunk({ title: "L", order: 1 }, [
      {
        challenge: { question: "Q?", type: "SELECT", order: 1 },
        options: [{ text: "A", correct: true }],
      },
    ]);
    expect(result).toContain("Challenge Types: SELECT");
    expect(result).toContain("Total Challenges: 1");
  });

  it("lists unique challenge types", () => {
    const result = formatLessonChunk({ title: "L", order: 1 }, [
      {
        challenge: { question: "Q1", type: "SELECT", order: 1 },
        options: [{ text: "A", correct: true }],
      },
      {
        challenge: { question: "Q2", type: "ASSIST", order: 2 },
        options: [{ text: "B", correct: true }],
      },
    ]);
    expect(result).toContain("SELECT");
    expect(result).toContain("ASSIST");
  });

  it("shows N/A when a challenge has no correct option", () => {
    const result = formatLessonChunk({ title: "L", order: 1 }, [
      {
        challenge: { question: "Q?", type: "SELECT", order: 1 },
        options: [{ text: "Wrong", correct: false }],
      },
    ]);
    expect(result).toContain("Correct Answer: N/A");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// formatCourseManifest
// ═══════════════════════════════════════════════════════════════════════

describe("formatCourseManifest", () => {
  it("returns manifest header with course title", () => {
    const result = formatCourseManifest({
      title: "Sinhala Basics",
      units: [],
    });
    expect(result).toContain("COURSE MANIFEST");
    expect(result).toContain("Course: Sinhala Basics");
  });

  it("handles course with no units", () => {
    const result = formatCourseManifest({ title: "Empty", units: [] });
    expect(result).toContain("No units available");
  });

  it("lists units and their lessons", () => {
    const result = formatCourseManifest({
      title: "Sinhala",
      units: [
        {
          title: "Greetings",
          description: "Basic greetings and farewells",
          order: 1,
          lessons: [
            { title: "Hello", order: 1 },
            { title: "Goodbye", order: 2 },
          ],
        },
      ],
    });
    expect(result).toContain("Unit 1: Greetings");
    expect(result).toContain("Description: Basic greetings and farewells");
    expect(result).toContain("1. Hello");
    expect(result).toContain("2. Goodbye");
  });

  it("sorts units by order", () => {
    const result = formatCourseManifest({
      title: "Sinhala",
      units: [
        { title: "Second", description: "D2", order: 2, lessons: [] },
        { title: "First", description: "D1", order: 1, lessons: [] },
      ],
    });
    const firstIdx = result.indexOf("First");
    const secondIdx = result.indexOf("Second");
    expect(firstIdx).toBeLessThan(secondIdx);
  });

  it("sorts lessons within units by order", () => {
    const result = formatCourseManifest({
      title: "Sinhala",
      units: [
        {
          title: "Unit",
          description: "D",
          order: 1,
          lessons: [
            { title: "Lesson B", order: 2 },
            { title: "Lesson A", order: 1 },
          ],
        },
      ],
    });
    const aIdx = result.indexOf("Lesson A");
    const bIdx = result.indexOf("Lesson B");
    expect(aIdx).toBeLessThan(bIdx);
  });

  it("shows '(no lessons)' for units without lessons", () => {
    const result = formatCourseManifest({
      title: "Sinhala",
      units: [{ title: "Empty Unit", description: "D", order: 1, lessons: [] }],
    });
    expect(result).toContain("(no lessons)");
  });
});
