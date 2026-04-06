// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportContent, formatContent, isExecutedAsCli } from "./export-course-content";

const mockFindMany = vi.fn();

vi.mock("@/db/drizzle", () => ({
  default: {
    query: {
      courses: {
        findMany: (...args: any[]) => mockFindMany(...args),
      },
    },
  },
}));

vi.mock("@/db/schema", () => ({
  courses: "courses_table",
  units: "units_table",
  lessons: "lessons_table",
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
}));

const { mockExists, mockSave, mockGetMetadata } = vi.hoisted(() => ({
  mockExists: vi.fn(),
  mockSave: vi.fn(),
  mockGetMetadata: vi.fn(),
}));

vi.mock("@google-cloud/storage", () => ({
  Storage: class {
    bucket() {
      return {
        file: () => ({
          exists: mockExists,
          save: mockSave,
          getMetadata: mockGetMetadata,
        }),
      };
    }
  },
}));

vi.mock("p-limit", () => ({
  default: () => (fn: () => Promise<unknown>) => fn(),
}));

const mockExistsSync = vi.fn();
const mockMkdirSync = vi.fn();
const mockWriteFileSync = vi.fn();

vi.mock("fs", () => ({
  default: {
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
    writeFileSync: (...args: unknown[]) => mockWriteFileSync(...args),
  },
}));

const flushPromises = () => new Promise<void>((r) => setTimeout(r, 100));

/** Helper that invokes all nested orderBy callbacks (for coverage) and resolves with the given data */
function mockFindManyWithData(data: any[]) {
  mockFindMany.mockImplementationOnce((opts: any) => {
    const mockAsc = vi.fn();
    if (opts?.orderBy) opts.orderBy({}, { asc: mockAsc });
    if (opts?.with?.units?.orderBy) opts.with.units.orderBy({}, { asc: mockAsc });
    if (opts?.with?.units?.with?.lessons?.orderBy)
      opts.with.units.with.lessons.orderBy({}, { asc: mockAsc });
    if (opts?.with?.units?.with?.lessons?.with?.challenges?.orderBy)
      opts.with.units.with.lessons.with.challenges.orderBy({}, { asc: mockAsc });
    if (opts?.with?.units?.with?.lessons?.with?.challenges?.with?.challengeOptions?.orderBy) {
      opts.with.units.with.lessons.with.challenges.with.challengeOptions.orderBy(
        {},
        { asc: mockAsc }
      );
    }
    return Promise.resolve(data);
  });
}

describe("export-course-content script", () => {
  const savedEnv = { ...process.env };
  const savedArgv = [...process.argv];

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      type: "service",
      project_id: "test",
      private_key: "fake-key\\nnewlines",
    });
    process.argv = [...savedArgv.slice(0, 2)];

    // Default: invoke orderBy callbacks and return empty array
    mockFindMany.mockImplementation((opts: any) => {
      const mockAsc = vi.fn();
      if (opts?.orderBy) opts.orderBy({}, { asc: mockAsc });
      if (opts?.with?.units?.orderBy) opts.with.units.orderBy({}, { asc: mockAsc });
      if (opts?.with?.units?.with?.lessons?.orderBy)
        opts.with.units.with.lessons.orderBy({}, { asc: mockAsc });
      if (opts?.with?.units?.with?.lessons?.with?.challenges?.orderBy)
        opts.with.units.with.lessons.with.challenges.orderBy({}, { asc: mockAsc });
      if (opts?.with?.units?.with?.lessons?.with?.challenges?.with?.challengeOptions?.orderBy) {
        opts.with.units.with.lessons.with.challenges.with.challengeOptions.orderBy(
          {},
          { asc: mockAsc }
        );
      }
      return Promise.resolve([]);
    });

    mockExists.mockResolvedValue([false]);
    mockSave.mockResolvedValue(undefined);
    mockExistsSync.mockReturnValue(true);
    mockMkdirSync.mockReturnValue(undefined);
    mockWriteFileSync.mockReturnValue(undefined);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    process.argv = savedArgv;
  });

  it("exits when GOOGLE_SERVICE_ACCOUNT_KEY is missing", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = "";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(((c: number) => {
      throw new Error(`exit ${c}`);
    }) as any);
    await expect(exportContent()).rejects.toThrow("exit 1");
  });

  it("exits when GOOGLE_SERVICE_ACCOUNT_KEY is invalid JSON", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = "not-valid-json{{{";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(((c: number) => {
      throw new Error(`exit ${c}`);
    }) as any);
    await expect(exportContent()).rejects.toThrow("exit 1");
  });

  it("exports and uploads course content", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFindManyWithData([
      {
        id: 1,
        title: "Basic",
        description: "desc",
        units: [
          {
            id: 1,
            title: "U",
            courseId: 1,
            order: 1,
            lessons: [
              {
                id: 1,
                title: "L",
                unitId: 1,
                order: 1,
                content: "text",
                challenges: [],
              },
            ],
          },
        ],
      },
    ]);

    await exportContent();
    await flushPromises();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Starting Speakify Content Export");
    expect(output).toContain("Lessons Processed:");
    expect(output).toContain("Files Uploaded:");
  });

  it("handles lesson with no challenges", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFindManyWithData([
      {
        id: 1,
        title: "C",
        units: [
          {
            id: 1,
            title: "U",
            courseId: 1,
            order: 1,
            lessons: [
              {
                id: 1,
                title: "L",
                unitId: 1,
                order: 1,
                content: null,
                challenges: [],
              },
            ],
          },
        ],
      },
    ]);

    await exportContent();
    await flushPromises();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Starting Speakify Content Export");
  });

  it("exports lesson with challenges and options", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFindManyWithData([
      {
        id: 1,
        title: "Sinhala Basics",
        units: [
          {
            id: 1,
            title: "Greetings",
            courseId: 1,
            order: 1,
            lessons: [
              {
                id: 1,
                title: "Hello",
                unitId: 1,
                order: 1,
                challenges: [
                  {
                    question: "What is 'hello' in Sinhala?",
                    type: "SELECT",
                    order: 1,
                    challengeOptions: [
                      { text: "ආයුබෝවන්", correct: true, id: 1 },
                      { text: "ස්තුතියි", correct: false, id: 2 },
                    ],
                  },
                  {
                    question: "Say goodbye",
                    type: "ASSIST",
                    order: 2,
                    challengeOptions: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);

    await exportContent();
    await flushPromises();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Starting Speakify Content Export");
    expect(output).toContain("UPLOADED");
  });

  it("skips upload when file hash matches remote", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockExists.mockResolvedValue([true]);
    // Use a hash that matches to trigger the skip path
    const crypto = await import("crypto");
    const formattedText = `
Course: C
Unit: U
Lesson: L

--- Lesson Content ---
No detailed content provided.
    `.trim();

    const testContent = JSON.stringify(
      {
        metadata: { courseId: 1, unitId: 1, lessonId: 1, title: "L" },
        content: formattedText,
      },
      null,
      2
    );
    const md5Hex = crypto.createHash("md5").update(testContent).digest("hex");
    const md5Base64 = Buffer.from(md5Hex, "hex").toString("base64");
    mockGetMetadata.mockResolvedValue([{ md5Hash: md5Base64 }]);

    mockFindManyWithData([
      {
        id: 1,
        title: "C",
        units: [
          {
            id: 1,
            title: "U",
            courseId: 1,
            order: 1,
            lessons: [
              {
                id: 1,
                title: "L",
                unitId: 1,
                order: 1,
                content: "text",
                challenges: [],
              },
            ],
          },
        ],
      },
    ]);
    await exportContent();
    await flushPromises();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("SKIPPED");
  });

  it("handles upload error gracefully and exits non-zero", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    mockExists.mockRejectedValue(new Error("GCS error"));

    mockFindManyWithData([
      {
        id: 1,
        title: "C",
        units: [
          {
            id: 1,
            title: "U",
            courseId: 1,
            order: 1,
            lessons: [
              {
                id: 1,
                title: "L",
                unitId: 1,
                order: 1,
                content: "text",
                challenges: [],
              },
            ],
          },
        ],
      },
    ]);

    await exportContent();
    await flushPromises();

    const errOutput = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(errOutput).toContain("Error processing");
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("FAILED");
    // stats.failed > 0 should trigger process.exit(1) via the thrown error
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("creates output dir when it does not exist", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockExistsSync.mockReturnValue(false);

    mockFindManyWithData([
      {
        id: 1,
        title: "C",
        units: [
          {
            id: 1,
            title: "U",
            courseId: 1,
            order: 1,
            lessons: [
              {
                id: 1,
                title: "L",
                unitId: 1,
                order: 1,
                content: "text",
                challenges: [],
              },
            ],
          },
        ],
      },
    ]);

    await exportContent();
    await flushPromises();

    expect(mockMkdirSync).toHaveBeenCalledWith(expect.stringContaining("rag-content"), {
      recursive: true,
    });
  });

  it("runs in dry-run mode without writing files", async () => {
    process.argv.push("--dry-run");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockWriteFileSync.mockClear();

    mockFindManyWithData([
      {
        id: 1,
        title: "C",
        units: [
          {
            id: 1,
            title: "U",
            courseId: 1,
            order: 1,
            lessons: [
              {
                id: 1,
                title: "L",
                unitId: 1,
                order: 1,
                content: "text",
                challenges: [],
              },
            ],
          },
        ],
      },
    ]);

    await exportContent();
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("DRY-RUN");
    expect(output).toContain("dry run");
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it("handles database error in exportContent", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    mockFindMany.mockRejectedValueOnce(new Error("DB connection failed"));

    await exportContent();
    await flushPromises();

    const errOutput = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(errOutput).toContain("Process Failed");
    expect(exitSpy).toHaveBeenCalled();
  });

  it("uploads when file exists but hash differs", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockExists.mockResolvedValue([true]);
    // Return a different hash that won't match the local content hash
    mockGetMetadata.mockResolvedValue([{ md5Hash: "AAAAAAAAAAAAAAAAAAAAAA==" }]);

    mockFindManyWithData([
      {
        id: 1,
        title: "C",
        units: [
          {
            id: 1,
            title: "U",
            courseId: 1,
            order: 1,
            lessons: [
              {
                id: 1,
                title: "L",
                unitId: 1,
                order: 1,
                content: "text",
                challenges: [],
              },
            ],
          },
        ],
      },
    ]);
    await exportContent();
    await flushPromises();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("UPLOADED");
    expect(mockSave).toHaveBeenCalled();
  });

  it("handles non-Error thrown in exportContent catch block", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    mockFindMany.mockRejectedValueOnce("string error");

    await exportContent();
    await flushPromises();

    const errOutput = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(errOutput).toContain("Process Failed");
    expect(exitSpy).toHaveBeenCalled();
  });
});

describe("formatContent", () => {
  it("formats lesson with challenges and options (no answer markers)", () => {
    const course = { title: "Sinhala" };
    const unit = { title: "Greetings" };
    const lesson = {
      title: "Hello",
      challenges: [
        {
          question: "What is hello?",
          type: "SELECT",
          challengeOptions: [
            { text: "ආයුබෝවන්", correct: true },
            { text: "ස්තුතියි", correct: false },
          ],
        },
      ],
    };

    const result = formatContent(course, unit, lesson);
    expect(result).toContain("Challenge: What is hello? (Type: SELECT)");
    expect(result).toContain("Options:");
    expect(result).toContain("  - ආයුබෝවන්");
    expect(result).toContain("  - ස්තුතියි");
    // Ensure correct answer markers are NOT present
    expect(result).not.toContain("(Correct Answer)");
  });

  it("formats lesson with challenges that have no options", () => {
    const course = { title: "Sinhala" };
    const unit = { title: "Unit 1" };
    const lesson = {
      title: "Lesson 1",
      challenges: [
        {
          question: "Translate this",
          type: "ASSIST",
          challengeOptions: [],
        },
      ],
    };

    const result = formatContent(course, unit, lesson);
    expect(result).toContain("Challenge: Translate this (Type: ASSIST)");
    expect(result).not.toContain("Options:");
  });

  it("formats lesson with no challenges", () => {
    const course = { title: "Sinhala" };
    const unit = { title: "Unit 1" };
    const lesson = { title: "Lesson 1", challenges: [] };

    const result = formatContent(course, unit, lesson);
    expect(result).toContain("No detailed content provided.");
  });

  it("formats lesson with multiple challenges", () => {
    const course = { title: "Course" };
    const unit = { title: "Unit" };
    const lesson = {
      title: "Lesson",
      challenges: [
        {
          question: "Q1",
          type: "SELECT",
          challengeOptions: [{ text: "A", correct: true }],
        },
        {
          question: "Q2",
          type: "SELECT",
          challengeOptions: [{ text: "B", correct: false }],
        },
      ],
    };

    const result = formatContent(course, unit, lesson);
    expect(result).toContain("Challenge: Q1 (Type: SELECT)");
    expect(result).toContain("Challenge: Q2 (Type: SELECT)");
    expect(result).toContain("  - A");
    expect(result).toContain("  - B");
  });
});

describe("isExecutedAsCli", () => {
  const savedArgv = [...process.argv];

  afterEach(() => {
    process.argv = savedArgv;
  });

  it("returns false when process.argv[1] is undefined", () => {
    process.argv = [process.argv[0]];
    expect(isExecutedAsCli()).toBe(false);
  });

  it("returns false when process.argv[1] does not match import.meta.url", () => {
    process.argv = [process.argv[0], "/some/other/script.ts"];
    expect(isExecutedAsCli()).toBe(false);
  });
});
