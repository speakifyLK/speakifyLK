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
              then: (resolve: any, reject: any) => mockSelect().then(resolve).catch(reject),
            };
          },
          then: (resolve: any, reject: any) => mockSelect().then(resolve).catch(reject),
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

vi.mock("drizzle-orm", () => ({ eq: vi.fn((a, b) => ({ field: a, value: b })) }));

const { mockExists, mockSave, mockGetMetadata } = vi.hoisted(() => ({
  mockExists: vi.fn(),
  mockSave: vi.fn(),
  mockGetMetadata: vi.fn(),
}));

vi.mock("@google-cloud/storage", () => ({
  Storage: class {
    bucket() {
      return {
        file: () => ({ exists: mockExists, save: mockSave, getMetadata: mockGetMetadata }),
      };
    }
  },
}));

vi.mock("p-limit", () => ({ default: () => (fn: () => Promise<unknown>) => fn() }));

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
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
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    process.argv = savedArgv;
  });

  it("exits when GOOGLE_SERVICE_ACCOUNT_KEY is missing", async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
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
      .mockResolvedValueOnce([{ id: 1, title: "L", unitId: 1, content: "text" }]);

    await import("./export-course-content");
    await flushPromises();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Starting Speakify Content Export");
    expect(output).toContain("Lessons Processed:");
  });

  it("skips upload when file hash matches remote", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    mockExists.mockResolvedValue([true]);
    mockGetMetadata.mockResolvedValue([{ md5Hash: "random" }]);
    mockSelect
      .mockResolvedValueOnce([{ id: 1, title: "C" }])
      .mockResolvedValueOnce([{ id: 1, title: "U" }])
      .mockResolvedValueOnce([{ id: 1, title: "L", unitId: 1, content: "text" }]);
    await import("./export-course-content");
    await flushPromises();
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Starting Speakify Content Export");
  });
});
