// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fetchMock = vi.fn();
global.fetch = fetchMock;
vi.mock("../lib/gcp-auth", () => ({ getAuthHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test" }) }));

const mockFs = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
};

vi.mock("node:fs/promises", () => mockFs);
const flushPromises = () => new Promise<void>((r) => setTimeout(r, 100));

describe("import-rag-files script", () => {
  const savedEnv = { ...process.env };
  const savedArgv = [...process.argv];

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mockFs.readFile.mockRejectedValue(new Error("enoent"));
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    
    process.env.GCP_PROJECT_ID = "pid"; process.env.GCP_LOCATION = "loc"; process.env.RAG_CORPUS_ID = "rag_id";
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({ type: "service", project_id: "test", private_key: "pk" });
    process.argv = [...savedArgv.slice(0, 2)];
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    process.argv = savedArgv;
  });

  it("imports rag files successfully in force mode", async () => {
    process.argv.push("--force");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    mockFs.readFile.mockResolvedValue(JSON.stringify({ version: 1, updatedAt: "", files: {} }));

    fetchMock
      // 1. list GCS objects
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ items: [{ name: "rag-content/file.json", md5Hash: "hash1" }] }) })
      // 2. list rag files (for deletion in force mode)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ ragFiles: [{ name: "corpus/ragFiles/1", gcsSource: { uris: [] } }] }) })
      // 3. delete rag file
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ done: true }) })
      // 4. import
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ done: true }) });

    await import("./import-rag-files");
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Listing gs://");
    expect(output).toContain("Importing batch 1 (1 file(s))");
    expect(mockFs.writeFile).toHaveBeenCalled();
  });
});
