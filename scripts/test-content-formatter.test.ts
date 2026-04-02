// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* ── Mocks ─────────────────────────────────────────────────────────── */

// We need to mock content-formatter to control what the assert() calls evaluate to.
// For the "all pass" path, we return strings that contain ALL the expected substrings.
// For the "some fail" path, we return strings missing some substrings.

const formatChallengeChunkMock = vi.fn();
const formatLessonChunkMock = vi.fn();
const formatCourseManifestMock = vi.fn();

vi.mock("../lib/content-formatter", () => ({
  formatChallengeChunk: formatChallengeChunkMock,
  formatLessonChunk: formatLessonChunkMock,
  formatCourseManifest: formatCourseManifestMock,
}));

const flushPromises = () => new Promise<void>((r) => setTimeout(r, 100));

describe("test-content-formatter script", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    formatChallengeChunkMock.mockReset();
    formatLessonChunkMock.mockReset();
    formatCourseManifestMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("all assertions pass when formatters return expected content", async () => {
    // formatChallengeChunk must contain all expected strings
    formatChallengeChunkMock.mockReturnValue(
      [
        "=== METADATA ===",
        "=== CONTENT ===",
        "Course: Sinhala",
        "Unit: Unit 1 – Greetings",
        "Lesson: Basic Greetings",
        "Challenge Type: SELECT",
        'Question: Which word means "hello"?',
        "ආයුබෝවන් ✅",
        "Correct Answer: ආයුබෝවන්",
      ].join("\n")
    );

    // formatLessonChunk is called twice: once for full lesson, once for empty lesson
    formatLessonChunkMock
      .mockReturnValueOnce(
        [
          "=== METADATA ===",
          "Total Challenges: 2",
          "Challenge 1 of 2 (SELECT)",
          "Challenge 2 of 2 (ASSIST)",
          "Lesson: Basic Greetings (Lesson 1)",
          "Challenge Types: SELECT, ASSIST",
        ].join("\n")
      )
      .mockReturnValueOnce(["Total Challenges: 0", "No challenges available"].join("\n"));

    // formatCourseManifest called twice: once for full, once for empty
    formatCourseManifestMock
      .mockReturnValueOnce(
        [
          "=== COURSE MANIFEST ===",
          "Course: Sinhala",
          "Unit 1: Unit 1 – Greetings",
          "Unit 2: Unit 2 – Numbers",
          "Description: Learn basic Sinhala greetings",
          "1. Basic Greetings",
          "2. Numbers 11-20",
        ].join("\n")
      )
      .mockReturnValueOnce("No units available");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    await import("./test-content-formatter");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("All tests passed!");
    // No process.exit should be called
  });

  it("exits with 1 when some assertions fail", async () => {
    // Return strings missing required content so assert() calls fail
    formatChallengeChunkMock.mockReturnValue("missing everything");
    formatLessonChunkMock.mockReturnValue("missing everything");
    formatCourseManifestMock.mockReturnValue("missing everything");

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./test-content-formatter");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    // Should have some failed assertions
    const errOutput = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(errOutput).toContain("❌");
  });
});
