import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import path from "node:path";

const { mockGetAuthHeaders } = vi.hoisted(() => ({
  mockGetAuthHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test-token" }),
}));

vi.mock("../lib/gcp-auth", () => ({
  getAuthHeaders: mockGetAuthHeaders,
}));

const scriptEntryPath = path.resolve(process.cwd(), "scripts/import-rag-files.ts");

function jsonResponse(data: unknown, ok = true): Response {
  return new Response(JSON.stringify(data), {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "application/json" },
  });
}

describe("import-rag-files CLI (status mode)", () => {
  const originalArgv = process.argv.slice();
  const originalFetch = globalThis.fetch;
  const saJson = JSON.stringify({ type: "service_account", project_id: "p" });

  let main: () => Promise<void>;

  beforeAll(async () => {
    const mod = await import("./import-rag-files.ts");
    main = mod.main;
  });

  beforeEach(() => {
    process.env.GCP_PROJECT_ID = "proj";
    process.env.GCP_LOCATION = "us-central1";
    process.env.RAG_CORPUS_ID = "corpus1";
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = saJson;
    mockGetAuthHeaders.mockClear();
  });

  afterEach(() => {
    process.argv = originalArgv.slice();
    globalThis.fetch = originalFetch;
  });

  it("runs --status with empty ragFiles list", async () => {
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/ragFiles?") && !url.includes("ragChunks")) {
        return Promise.resolve(jsonResponse({ ragFiles: [] }));
      }
      return Promise.resolve(jsonResponse({}));
    }) as typeof fetch;

    process.argv = ["node", scriptEntryPath, "--status"];
    await main();
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it("warns when --status is combined with import flags", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.fetch = vi.fn(() => Promise.resolve(jsonResponse({ ragFiles: [] }))) as typeof fetch;

    process.argv = ["node", scriptEntryPath, "--status", "--force", "--diff"];
    await main();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("--status ignores"));
    warn.mockRestore();
  });

  it("aggregates paginated ragChunks for chunk counts", async () => {
    const rf =
      "projects/proj/locations/us-central1/ragCorpora/corpus1/ragFiles/file-a";
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/ragFiles?") && !url.includes("ragChunks")) {
        return Promise.resolve(
          jsonResponse({
            ragFiles: [
              {
                name: rf,
                displayName: "doc",
                fileStatus: { state: "ACTIVE" },
              },
            ],
          })
        );
      }
      if (url.includes("/ragChunks") && !url.includes("pageToken")) {
        return Promise.resolve(
          jsonResponse({ ragChunks: [{ id: "1" }], nextPageToken: "t2" })
        );
      }
      if (url.includes("pageToken=t2")) {
        return Promise.resolve(jsonResponse({ ragChunks: [{ id: "2" }, { id: "3" }] }));
      }
      return Promise.resolve(jsonResponse({}));
    }) as typeof fetch;

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    process.argv = ["node", scriptEntryPath, "--status"];
    await main();
    expect(log.mock.calls.some((c) => String(c[0]).includes("Total chunks:    3"))).toBe(true);
    log.mockRestore();
  });

  it("marks chunk totals partial when ragChunks request fails", async () => {
    const rf =
      "projects/proj/locations/us-central1/ragCorpora/corpus1/ragFiles/file-b";
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/ragFiles?") && !url.includes("ragChunks")) {
        return Promise.resolve(
          jsonResponse({
            ragFiles: [
              {
                name: rf,
                displayName: "doc",
                fileStatus: { state: "ACTIVE" },
              },
            ],
          })
        );
      }
      if (url.includes("/ragChunks")) {
        return Promise.resolve(new Response("err", { status: 500 }));
      }
      return Promise.resolve(jsonResponse({}));
    }) as typeof fetch;

    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    process.argv = ["node", scriptEntryPath, "--status"];
    await main();
    expect(log.mock.calls.some((c) => String(c[0]).includes("partial"))).toBe(true);
    log.mockRestore();
  });
});

describe("isExecutedAsCli", () => {
  const originalArgv = process.argv.slice();

  afterEach(() => {
    process.argv = originalArgv.slice();
    vi.restoreAllMocks();
  });

  it("returns true when argv[1] resolves to this script path", async () => {
    process.argv = ["node", scriptEntryPath];
    const { isExecutedAsCli } = await import("./import-rag-files.ts");
    expect(isExecutedAsCli()).toBe(true);
  });

  it("returns false without argv[1]", async () => {
    process.argv = ["node"];
    const { isExecutedAsCli } = await import("./import-rag-files.ts");
    expect(isExecutedAsCli()).toBe(false);
  });

  it("returns false for a different entry script", async () => {
    process.argv = ["node", path.join(process.cwd(), "package.json")];
    const { isExecutedAsCli } = await import("./import-rag-files.ts");
    expect(isExecutedAsCli()).toBe(false);
  });

});
