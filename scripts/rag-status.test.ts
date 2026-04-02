// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fetchMock = vi.fn();
global.fetch = fetchMock;

vi.mock("../lib/gcp-auth", () => ({ getAuthHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test" }) }));

const flushPromises = () => new Promise<void>((r) => setTimeout(r, 100));

describe("rag-status script", () => {
  const savedEnv = { ...process.env };
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.GCP_PROJECT_ID = "pid"; process.env.GCP_LOCATION = "loc"; process.env.RAG_CORPUS_ID = "rag_id";
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({ type: "service", project_id: "test", private_key: "pk" });
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => { process.env = { ...savedEnv }; });

  it("reports fully synced when GCS and corpus match", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    // 1. Corpus info
    fetchMock.mockResolvedValueOnce({
      ok: true, json: async () => ({ name: "corpus", displayName: "Corpus" })
    });
    // 2. GCS list
    fetchMock.mockResolvedValueOnce({
      ok: true, json: async () => ({ items: [{ name: "rag-content/lesson.json", md5Hash: "fakehash" }] })
    });
    // 3. RagFiles
    fetchMock.mockResolvedValueOnce({
      ok: true, json: async () => ({ ragFiles: [{ gcsSource: { uris: ["gs://speakifylk-rag-content/rag-content/lesson.json"] } }] })
    });

    await import("./rag-status");
    await flushPromises();
    
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("RAG Pipeline Status");
    expect(output).toContain("fully in sync!");
  });
});
