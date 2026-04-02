// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fetchMock = vi.fn();
global.fetch = fetchMock;
vi.mock("../lib/gcp-auth", () => ({ getAuthHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test" }) }));
const flushPromises = () => new Promise<void>((r) => setTimeout(r, 100));

describe("create-rag-corpus script", () => {
  const savedEnv = { ...process.env };
  const savedArgv = [...process.argv];

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.GCP_PROJECT_ID = "pid"; process.env.GCP_LOCATION = "loc";
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({ type: "service", project_id: "test", private_key: "pk" });
    process.argv = [...savedArgv.slice(0, 2)];
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    process.argv = savedArgv;
  });

  it("checks existing corpora when --check flag is passed", async () => {
    process.argv.push("--check");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: true, json: async () => ({ ragCorpora: [{ name: "loc/ragCorpora/123", displayName: "S Corpus" }] })
    });

    await import("./create-rag-corpus");
    await flushPromises();
    
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("123");
    expect(output).toContain("S Corpus");
  });

  it("creates a new corpus successfully", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Creation returns an LRO
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ name: "operations/1" }) });
    // LRO poll returns success
    fetchMock.mockResolvedValueOnce({
      ok: true, json: async () => ({ done: true, response: { name: "loc/ragCorpora/abc" } })
    });

    await import("./create-rag-corpus");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("RAG corpus created successfully");
  });
});
