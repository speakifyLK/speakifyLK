// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fetchMock = vi.fn();
global.fetch = fetchMock;
vi.mock("../lib/gcp-auth", () => ({
  getAuthHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test" }),
}));
const flushPromises = () => new Promise<void>((r) => setTimeout(r, 100));

describe("create-rag-corpus script", () => {
  const savedEnv = { ...process.env };
  const savedArgv = [...process.argv];

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    fetchMock.mockReset();
    process.env.GCP_PROJECT_ID = "pid";
    process.env.GCP_LOCATION = "loc";
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      type: "service",
      project_id: "test",
      private_key: "pk",
    });
    process.argv = [...savedArgv.slice(0, 2)];
  });

  afterEach(() => {
    process.env = { ...savedEnv };
    process.argv = savedArgv;
  });

  // ── assertEnvVars ──────────────────────────────────────────────────

  it("exits when GCP_PROJECT_ID is missing", async () => {
    process.env.GCP_PROJECT_ID = "";
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./create-rag-corpus");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("GCP_PROJECT_ID");
  });

  it("exits when GCP_LOCATION is missing", async () => {
    process.env.GCP_LOCATION = "";
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./create-rag-corpus");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("GCP_LOCATION");
  });

  it("exits when GOOGLE_SERVICE_ACCOUNT_KEY is missing", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = "";
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./create-rag-corpus");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("GOOGLE_SERVICE_ACCOUNT_KEY");
  });

  // ── --check: listCorpora ───────────────────────────────────────────

  it("checks existing corpora when --check flag is passed", async () => {
    process.argv.push("--check");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ragCorpora: [
          {
            name: "loc/ragCorpora/123",
            displayName: "S Corpus",
            createTime: "2025-01-01T00:00:00Z",
          },
        ],
      }),
    });

    await import("./create-rag-corpus");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("123");
    expect(output).toContain("S Corpus");
  });

  it("shows message when no corpora found with --check", async () => {
    process.argv.push("--check");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await import("./create-rag-corpus");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("No corpora found");
  });

  it("handles corpora with missing fields in --check", async () => {
    process.argv.push("--check");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ragCorpora: [
          { name: "", displayName: undefined, createTime: undefined },
          {
            name: "path/to/corpus",
            displayName: "A very long display name that should be clipped",
          },
        ],
      }),
    });

    await import("./create-rag-corpus");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Found 2 corpus/corpora");
  });

  it("handles API error when listing corpora with --check", async () => {
    process.argv.push("--check");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "auth error",
    });

    await import("./create-rag-corpus");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  // ── handleApiError branches ────────────────────────────────────────

  it("shows 404 suggestion on API error", async () => {
    process.argv.push("--check");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => "not found",
    });

    await import("./create-rag-corpus");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Verify GCP_PROJECT_ID");
  });

  it("shows 429 suggestion on API error", async () => {
    process.argv.push("--check");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      text: async () => "rate limited",
    });

    await import("./create-rag-corpus");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("rate-limited");
  });

  it("handles generic error status with no special suggestion", async () => {
    process.argv.push("--check");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
      text: async () => "internal error",
    });

    await import("./create-rag-corpus");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Failed to list RAG corpora");
  });

  it("handles response.text() failure in handleApiError", async () => {
    process.argv.push("--check");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
      text: async () => {
        throw new Error("read failed");
      },
    });

    await import("./create-rag-corpus");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("unable to read response body");
  });

  // ── createCorpus ───────────────────────────────────────────────────

  it("creates a new corpus successfully via LRO", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Creation returns an LRO
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: "operations/1" }),
    });
    // LRO poll returns success
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        done: true,
        response: { name: "loc/ragCorpora/abc" },
      }),
    });

    await import("./create-rag-corpus");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("RAG corpus created successfully");
  });

  it("handles direct corpus name response (includes ragCorpora)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // API returns corpus directly with ragCorpora in name but NOT operations
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: "projects/p/locations/l/ragCorpora/xyz" }),
    });

    await import("./create-rag-corpus");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("RAG corpus created successfully");
    expect(output).toContain("xyz");
  });

  it("handles non-operation, non-ragCorpora name as direct corpus resource", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // The name doesn't contain 'operations', so goes to else branch at line 216-218
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: "some-corpus-resource-name" }),
    });

    await import("./create-rag-corpus");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("RAG corpus created successfully");
  });

  it("exits when API returns unexpected response with no name", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ unexpected: true }),
    });

    await import("./create-rag-corpus");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Unexpected response format");
  });

  it("exits when create API returns error status", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: async () => "forbidden",
    });

    await import("./create-rag-corpus");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  // ── pollOperation edge cases ───────────────────────────────────────

  it("handles operation completed with error", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Creation returns an LRO
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: "operations/1" }),
    });
    // Poll returns done with error
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        done: true,
        error: { code: 500, message: "internal" },
      }),
    });

    await import("./create-rag-corpus");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Operation completed with error");
  });

  it("handles poll API error", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Creation returns an LRO
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: "operations/1" }),
    });
    // Poll returns error
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
      text: async () => "poll error",
    });

    await import("./create-rag-corpus");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("handles operation with done response but no corpus name", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Creation returns an LRO
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: "operations/1" }),
    });
    // Poll returns done but no corpus name in response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ done: true, response: {} }),
    });

    await import("./create-rag-corpus");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Operation completed but no corpus name found");
  });

  it("polls operation multiple times before completion", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Creation returns an LRO
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: "operations/1" }),
    });
    // First poll: not done
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ done: false }),
    });
    // Second poll: done
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        done: true,
        response: { name: "loc/ragCorpora/polled" },
      }),
    });

    await import("./create-rag-corpus");
    // Wait longer to account for the poll interval
    await new Promise<void>((r) => setTimeout(r, 4000));

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("RAG corpus created successfully");
    // Verify the "." was written during polling
    expect(writeSpy).toHaveBeenCalledWith(".");
  });

  // ── main().catch ───────────────────────────────────────────────────

  it("catches unexpected errors in main()", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.spyOn(console, "log").mockImplementation(() => {});

    // Make fetch throw to trigger the main().catch()
    fetchMock.mockRejectedValueOnce(new Error("network failure"));

    await import("./create-rag-corpus");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("network failure");
  });

  it("catches non-Error unexpected errors in main()", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.spyOn(console, "log").mockImplementation(() => {});

    // Make fetch throw a string (non-Error)
    fetchMock.mockRejectedValueOnce("string error");

    await import("./create-rag-corpus");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Unexpected error");
  });

  it("handles direct corpus name when operationName is falsy but directName has ragCorpora", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Use a getter that returns different values on successive reads:
    // First read (operationName): undefined → enters !operationName branch
    // Second read (directName): "projects/p/locations/l/ragCorpora/trick"
    let readCount = 0;
    const trickObj = {
      get name() {
        readCount++;
        return readCount === 1 ? undefined : "projects/p/locations/l/ragCorpora/trick";
      },
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => trickObj,
    });

    await import("./create-rag-corpus");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("RAG corpus created successfully");
    expect(output).toContain("trick");
  });

  it("handles pollOperation timeout by mocking Date.now", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    // Creation returns an LRO
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: "operations/slow" }),
    });

    // Make Date.now advance past 5 minutes on the second call inside pollOperation
    let callCount = 0;
    const realNow = Date.now;
    vi.spyOn(Date, "now").mockImplementation(() => {
      callCount++;
      // First call is the start timestamp (line 80)
      // Second call is the while-loop check (line 85) - should exceed timeout
      if (callCount >= 2) return realNow() + 6 * 60 * 1000; // 6 minutes ahead
      return realNow();
    });

    await import("./create-rag-corpus");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Operation timed out");
  });

  it("handles corpus name with empty string in printCorpusResult fallback", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Return a name that doesn't contain 'operations' - goes to printCorpusResult directly
    // Use a name ending with "/" so .split("/").pop() returns "" triggering the || fallback
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: "trailing-slash/" }),
    });

    await import("./create-rag-corpus");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("RAG corpus created successfully");
    // The || fallback kicks in, using the full resource name
    expect(output).toContain("trailing-slash/");
  });
});
