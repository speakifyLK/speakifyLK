// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* ── Mocks ─────────────────────────────────────────────────────────── */

vi.mock("dotenv", () => ({
  config: vi.fn(),
}));

const getAllChallengesWithOptionsMock = vi.fn();
const getAllLessonsWithContextMock = vi.fn();
const getCourseStructureMock = vi.fn();

vi.mock("../db/export-queries", () => ({
  getAllChallengesWithOptions: getAllChallengesWithOptionsMock,
  getAllLessonsWithContext: getAllLessonsWithContextMock,
  getCourseStructure: getCourseStructureMock,
}));

const flushPromises = () => new Promise<void>((r) => setTimeout(r, 100));

describe("test-export-queries script", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    getAllChallengesWithOptionsMock.mockReset();
    getAllLessonsWithContextMock.mockReset();
    getCourseStructureMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("runs all three queries and logs results (with data)", async () => {
    getAllChallengesWithOptionsMock.mockResolvedValue([
      {
        title: "Lesson A",
        challenges: [
          {
            type: "SELECT",
            question: "Q1?",
            challengeOptions: [{ text: "a" }],
          },
          { type: "ASSIST", question: "Q2?", challengeOptions: [] },
        ],
      },
      {
        title: "Lesson B",
        challenges: [
          {
            type: "SELECT",
            question: "Q3?",
            challengeOptions: [{ text: "b" }],
          },
        ],
      },
      {
        title: "Lesson C",
        challenges: [],
      },
    ]);

    getAllLessonsWithContextMock.mockResolvedValue([
      { title: "L1", unit: { title: "U1", course: { title: "C1" } } },
      { title: "L2", unit: { title: "U2", course: { title: "C1" } } },
      { title: "L3", unit: { title: "U3", course: { title: "C2" } } },
      { title: "L4", unit: { title: "U4", course: { title: "C2" } } },
    ]);

    getCourseStructureMock.mockResolvedValue([
      {
        title: "Sinhala",
        units: [
          {
            title: "Unit 1",
            lessons: [
              { title: "Nouns", challenges: [{ id: 1 }] },
              { title: "Verbs", challenges: [{ id: 2 }, { id: 3 }] },
              { title: "Extra", challenges: [] },
            ],
          },
          {
            title: "Unit 2",
            lessons: [{ title: "Colors", challenges: [{ id: 4 }] }],
          },
        ],
      },
    ]);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await import("./test-export-queries");
    await flushPromises();

    expect(getAllChallengesWithOptionsMock).toHaveBeenCalled();
    expect(getAllLessonsWithContextMock).toHaveBeenCalled();
    expect(getCourseStructureMock).toHaveBeenCalled();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Lessons returned: 3");
    expect(output).toContain("Lesson A");
    expect(output).toContain("Lessons returned: 4");
    expect(output).toContain("Courses returned: 1");
    expect(output).toContain("Sinhala");
    expect(output).toContain("All export queries executed successfully");
  });

  it("runs with empty data (no lessons, courses)", async () => {
    getAllChallengesWithOptionsMock.mockResolvedValue([]);
    getAllLessonsWithContextMock.mockResolvedValue([]);
    getCourseStructureMock.mockResolvedValue([]);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await import("./test-export-queries");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Lessons returned: 0");
    expect(output).toContain("Courses returned: 0");
    expect(output).toContain("All export queries executed successfully");
  });

  it("exits with 1 when a query rejects", async () => {
    getAllChallengesWithOptionsMock.mockRejectedValue(new Error("DB down"));

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./test-export-queries");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Test failed");
  });
});
