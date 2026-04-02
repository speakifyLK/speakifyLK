// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* ── Mocks ─────────────────────────────────────────────────────────── */

vi.mock("dotenv", () => ({
  config: vi.fn(),
}));

const findFirstMock = vi.fn();

vi.mock("../db/drizzle", () => ({
  default: {
    query: {
      courses: {
        findFirst: findFirstMock,
      },
    },
  },
}));

vi.mock("../db/schema", () => ({
  units: { order: "units.order" },
  lessons: { order: "lessons.order" },
  challenges: { order: "challenges.order" },
  challengeOptions: { id: "challengeOptions.id" },
}));

vi.mock("drizzle-orm", () => ({
  asc: vi.fn((col: unknown) => col),
}));

const formatChallengeChunkMock = vi.fn().mockReturnValue("CHALLENGE_CHUNK");
const formatLessonChunkMock = vi.fn().mockReturnValue("LESSON_CHUNK");
const formatCourseManifestMock = vi.fn().mockReturnValue("COURSE_MANIFEST");

vi.mock("../lib/content-formatter", () => ({
  formatChallengeChunk: formatChallengeChunkMock,
  formatLessonChunk: formatLessonChunkMock,
  formatCourseManifest: formatCourseManifestMock,
  // types are compile-time only, no runtime values needed
}));

const flushPromises = () => new Promise<void>((r) => setTimeout(r, 100));

describe("test-content-formatter-integration script", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    findFirstMock.mockReset();
    formatChallengeChunkMock.mockReset().mockReturnValue("CHALLENGE_CHUNK");
    formatLessonChunkMock.mockReset().mockReturnValue("LESSON_CHUNK");
    formatCourseManifestMock.mockReset().mockReturnValue("COURSE_MANIFEST");
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("exits with 0 when no course is found", async () => {
    findFirstMock.mockResolvedValue(null);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./test-content-formatter-integration");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(0);
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("No courses found in DB");
  });

  it("runs full success path with course that has lessons with challenges", async () => {
    findFirstMock.mockResolvedValue({
      id: 1,
      title: "Sinhala",
      units: [
        {
          title: "Unit 1",
          description: "Basics",
          order: 1,
          lessons: [
            {
              title: "Nouns",
              order: 1,
              challenges: [
                {
                  question: "Q1?",
                  type: "SELECT",
                  order: 1,
                  challengeOptions: [
                    {
                      text: "opt1",
                      correct: true,
                      imageSrc: null,
                      audioSrc: null,
                    },
                    {
                      text: "opt2",
                      correct: false,
                      imageSrc: null,
                      audioSrc: null,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./test-content-formatter-integration");
    await flushPromises();

    expect(formatCourseManifestMock).toHaveBeenCalled();
    expect(formatChallengeChunkMock).toHaveBeenCalled();
    expect(formatLessonChunkMock).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Integration test passed");
  });

  it("handles course with units but no lessons with challenges (falls through)", async () => {
    findFirstMock.mockResolvedValue({
      id: 2,
      title: "Tamil",
      units: [
        {
          title: "Unit 1",
          description: "Basics",
          order: 1,
          lessons: [
            {
              title: "Empty Lesson",
              order: 1,
              challenges: [],
            },
          ],
        },
      ],
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./test-content-formatter-integration");
    await flushPromises();

    expect(formatCourseManifestMock).toHaveBeenCalled();
    expect(formatChallengeChunkMock).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("No lessons with challenges found");
  });

  it("exits with 1 when main() throws an error", async () => {
    findFirstMock.mockRejectedValue(new Error("DB connection failed"));

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./test-content-formatter-integration");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Integration test failed");
    expect(output).toContain("DB connection failed");
  });

  it("exits with 1 when main() throws a non-Error value", async () => {
    findFirstMock.mockRejectedValue("string-error");

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./test-content-formatter-integration");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Integration test failed");
    expect(output).toContain("string-error");
  });
});
