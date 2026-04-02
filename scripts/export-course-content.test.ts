// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();

vi.mock("@/db/drizzle", () => ({
  default: {
    select: () => ({
      from: (table: unknown) => {
        mockFrom(table);
        return {
          where: (condition: unknown) => {
            mockWhere(condition);
            return {
              then: (resolve: any, reject: any) =>
                mockSelect().then(resolve).catch(reject),
            };
          },
          then: (resolve: any, reject: any) =>
            mockSelect().then(resolve).catch(reject),
        };
      },
    }),
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
    mockSelect.mockReset();
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
    await expect(import("./export-course-content")).rejects.toThrow("exit 1");
  });

  it("exits when GOOGLE_SERVICE_ACCOUNT_KEY is invalid JSON", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = "not-valid-json{{{";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(((c: number) => {
      throw new Error(`exit ${c}`);
    }) as any);
    await expect(import("./export-course-content")).rejects.toThrow("exit 1");
  });

  it("exports and uploads course content", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSelect
      .mockResolvedValueOnce([{ id: 1, title: "Basic", description: "desc" }])
      .mockResolvedValueOnce([{ id: 1, title: "U", courseId: 1 }])
      .mockResolvedValueOnce([
        { id: 1, title: "L", unitId: 1, content: "text" },
      ]);

    await import("./export-course-content");
    await flushPromises();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Starting Speakify Content Export");
    expect(output).toContain("Lessons Processed:");
    expect(output).toContain("Files Uploaded:");
  });

  it("handles lesson with no content field", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSelect
      .mockResolvedValueOnce([{ id: 1, title: "C" }])
      .mockResolvedValueOnce([{ id: 1, title: "U", courseId: 1 }])
      .mockResolvedValueOnce([{ id: 1, title: "L", unitId: 1, content: null }]);

    await import("./export-course-content");
    await flushPromises();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Starting Speakify Content Export");
  });

  it("skips upload when file hash matches remote", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockExists.mockResolvedValue([true]);
    // Use a hash that matches to trigger the skip path
    const crypto = await import("crypto");
    const testContent = JSON.stringify(
      {
        metadata: { courseId: 1, unitId: 1, lessonId: 1, title: "L" },
        content: "Course: C\n    Unit: U\n    Lesson: L\n    Content: text",
      },
      null,
      2
    );
    const md5Hex = crypto.createHash("md5").update(testContent).digest("hex");
    const md5Base64 = Buffer.from(md5Hex, "hex").toString("base64");
    mockGetMetadata.mockResolvedValue([{ md5Hash: md5Base64 }]);

    mockSelect
      .mockResolvedValueOnce([{ id: 1, title: "C" }])
      .mockResolvedValueOnce([{ id: 1, title: "U" }])
      .mockResolvedValueOnce([
        { id: 1, title: "L", unitId: 1, content: "text" },
      ]);
    await import("./export-course-content");
    await flushPromises();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("SKIPPED");
  });

  it("handles upload error gracefully", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockExists.mockRejectedValue(new Error("GCS error"));

    mockSelect
      .mockResolvedValueOnce([{ id: 1, title: "C" }])
      .mockResolvedValueOnce([{ id: 1, title: "U" }])
      .mockResolvedValueOnce([
        { id: 1, title: "L", unitId: 1, content: "text" },
      ]);

    await import("./export-course-content");
    await flushPromises();

    const errOutput = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(errOutput).toContain("Error processing");
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("FAILED");
  });

  it("creates output dir when it does not exist", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockExistsSync.mockReturnValue(false);

    mockSelect
      .mockResolvedValueOnce([{ id: 1, title: "C" }])
      .mockResolvedValueOnce([{ id: 1, title: "U" }])
      .mockResolvedValueOnce([
        { id: 1, title: "L", unitId: 1, content: "text" },
      ]);

    await import("./export-course-content");
    await flushPromises();

    expect(mockMkdirSync).toHaveBeenCalledWith(
      expect.stringContaining("rag-content"),
      {
        recursive: true,
      }
    );
  });

  it("runs in dry-run mode without writing files", async () => {
    process.argv.push("--dry-run");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockWriteFileSync.mockClear();

    mockSelect
      .mockResolvedValueOnce([{ id: 1, title: "C" }])
      .mockResolvedValueOnce([{ id: 1, title: "U" }])
      .mockResolvedValueOnce([
        { id: 1, title: "L", unitId: 1, content: "text" },
      ]);

    await import("./export-course-content");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("DRY-RUN");
    expect(output).toContain("dry run");
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it("handles database error in exportContent", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    mockSelect.mockRejectedValueOnce(new Error("DB connection failed"));

    await import("./export-course-content");
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
    mockGetMetadata.mockResolvedValue([
      { md5Hash: "AAAAAAAAAAAAAAAAAAAAAA==" },
    ]);

    mockSelect
      .mockResolvedValueOnce([{ id: 1, title: "C" }])
      .mockResolvedValueOnce([{ id: 1, title: "U" }])
      .mockResolvedValueOnce([
        { id: 1, title: "L", unitId: 1, content: "text" },
      ]);
    await import("./export-course-content");
    await flushPromises();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("UPLOADED");
    expect(mockSave).toHaveBeenCalled();
  });

  it("handles non-Error thrown in exportContent catch block", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    mockSelect.mockRejectedValueOnce("string error");

    await import("./export-course-content");
    await flushPromises();

    const errOutput = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(errOutput).toContain("Process Failed");
    expect(exitSpy).toHaveBeenCalled();
  });
});
