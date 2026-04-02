// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fetchMock = vi.fn();
global.fetch = fetchMock;

vi.mock("../lib/gcp-auth", () => ({
  getAuthHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test" }),
}));

const flushPromises = () => new Promise<void>((r) => setTimeout(r, 100));

describe("rag-status script", () => {
  const savedEnv = { ...process.env };
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    fetchMock.mockReset();
    process.env.GCP_PROJECT_ID = "pid";
    process.env.GCP_LOCATION = "loc";
    process.env.RAG_CORPUS_ID = "rag_id";
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      type: "service",
      project_id: "test",
      private_key: "pk",
    });
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  // ── Missing env vars ───────────────────────────────────────────────

  it("throws when required env var is missing at module level", async () => {
    process.env.GCP_PROJECT_ID = "";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(import("./rag-status")).rejects.toThrow(
      "Missing required environment variable: GCP_PROJECT_ID"
    );
  });

  // ── Fully synced scenario ──────────────────────────────────────────

  it("reports fully synced when GCS and corpus match", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // 1. Corpus info
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        displayName: "Corpus",
        createTime: "2025-01-01T00:00:00Z",
      }),
    });
    // 2. GCS list
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ name: "rag-content/lesson.json" }] }),
    });
    // 3. RagFiles
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ragFiles: [
          {
            gcsSource: {
              uris: ["gs://speakifylk-rag-content/rag-content/lesson.json"],
            },
          },
        ],
      }),
    });

    await import("./rag-status");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("RAG Pipeline Status");
    expect(output).toContain("fully in sync!");
    expect(output).toContain("Everything is up to date");
  });

  // ── Not-imported files (GCS files not in corpus) ───────────────────

  it("reports GCS files not yet imported", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Corpus info
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        displayName: "C",
        createTime: "2025-01-01T00:00:00Z",
      }),
    });
    // GCS has 2 files
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ name: "rag-content/a.json" }, { name: "rag-content/b.json" }],
      }),
    });
    // Corpus only has 1
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ragFiles: [
          {
            gcsSource: {
              uris: ["gs://speakifylk-rag-content/rag-content/a.json"],
            },
          },
        ],
      }),
    });

    await import("./rag-status");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("1 GCS file(s) not yet imported");
    expect(output).toContain("rag:import");
  });

  it("reports more than 5 not-imported files with truncation", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Corpus info
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ displayName: "C" }),
    });
    // GCS has 7 files
    const gcsItems = Array.from({ length: 7 }, (_, i) => ({
      name: `rag-content/file${i}.json`,
    }));
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: gcsItems }),
    });
    // Corpus has 0
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await import("./rag-status");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("7 GCS file(s) not yet imported");
    expect(output).toContain("... and 2 more");
  });

  // ── Orphaned files (corpus has files not in GCS) ───────────────────

  it("reports orphaned RagFiles with no matching GCS object", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Corpus info
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        displayName: "C",
        createTime: "2025-01-01T00:00:00Z",
      }),
    });
    // GCS has 0 files
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    // Corpus has 2 files
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ragFiles: [
          {
            gcsSource: {
              uris: ["gs://speakifylk-rag-content/rag-content/a.json"],
            },
          },
          {
            gcsSource: {
              uris: ["gs://speakifylk-rag-content/rag-content/b.json"],
            },
          },
        ],
      }),
    });

    await import("./rag-status");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("2 RagFile(s) with no matching GCS object");
    expect(output).toContain("rag:import:force");
  });

  it("reports more than 5 orphaned RagFiles with truncation", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ displayName: "C" }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    const ragFiles = Array.from({ length: 7 }, (_, i) => ({
      gcsSource: { uris: [`gs://bucket/file${i}.json`] },
    }));
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ragFiles }),
    });

    await import("./rag-status");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("7 RagFile(s) with no matching GCS object");
    expect(output).toContain("... and 2 more");
  });

  // ── Error fetching corpus info ─────────────────────────────────────

  it("handles error fetching corpus info", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Corpus info fails
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "server error",
    });
    // GCS succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ name: "rag-content/a.json" }] }),
    });
    // RagFiles succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ragFiles: [
          {
            gcsSource: {
              uris: ["gs://speakifylk-rag-content/rag-content/a.json"],
            },
          },
        ],
      }),
    });

    await import("./rag-status");
    await flushPromises();

    const errOutput = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(errOutput).toContain("Could not fetch corpus info");
  });

  // ── Error fetching GCS objects ─────────────────────────────────────

  it("handles error fetching GCS objects", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Corpus info succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        displayName: "C",
        createTime: "2025-01-01T00:00:00Z",
      }),
    });
    // GCS fails
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => "forbidden",
    });
    // RagFiles succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ragFiles: [{ gcsSource: { uris: ["gs://b/f.json"] } }],
      }),
    });

    await import("./rag-status");
    await flushPromises();

    const errOutput = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(errOutput).toContain("Could not list GCS objects");
    const logOutput = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(logOutput).toContain("Sync status unknown");
  });

  // ── Error fetching RagFiles ────────────────────────────────────────

  it("handles error fetching RagFiles", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Corpus info succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        displayName: "C",
        createTime: "2025-01-01T00:00:00Z",
      }),
    });
    // GCS succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ name: "rag-content/a.json" }] }),
    });
    // RagFiles fails
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "error",
    });

    await import("./rag-status");
    await flushPromises();

    const errOutput = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(errOutput).toContain("Could not list RagFiles");
    const logOutput = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(logOutput).toContain("Sync status unknown");
  });

  // ── Both GCS and RagFiles fail ─────────────────────────────────────

  it("shows sync status unknown when both GCS and RagFiles fail", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Corpus succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ displayName: "C" }),
    });
    // GCS fails
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "error",
    });
    // RagFiles fails
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "error",
    });

    await import("./rag-status");
    await flushPromises();

    const logOutput = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(logOutput).toContain("Sync status unknown");
  });

  // ── Paginated RagFiles listing ─────────────────────────────────────

  it("handles paginated RagFiles listing", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Corpus info
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        displayName: "C",
        createTime: "2025-01-01T00:00:00Z",
      }),
    });
    // GCS
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ name: "rag-content/a.json" }, { name: "rag-content/b.json" }],
      }),
    });
    // RagFiles page 1
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ragFiles: [
          {
            gcsSource: {
              uris: ["gs://speakifylk-rag-content/rag-content/a.json"],
            },
          },
        ],
        nextPageToken: "page2",
      }),
    });
    // RagFiles page 2
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ragFiles: [
          {
            gcsSource: {
              uris: ["gs://speakifylk-rag-content/rag-content/b.json"],
            },
          },
        ],
      }),
    });

    await import("./rag-status");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Imported: 2");
    expect(output).toContain("fully in sync!");
  });

  // ── Paginated GCS listing ──────────────────────────────────────────

  it("handles paginated GCS listing", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Corpus info
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ displayName: "C" }),
    });
    // GCS page 1
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ name: "rag-content/a.json" }],
        nextPageToken: "p2",
      }),
    });
    // GCS page 2
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ name: "rag-content/b.json" }],
      }),
    });
    // RagFiles
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ragFiles: [
          {
            gcsSource: {
              uris: ["gs://speakifylk-rag-content/rag-content/a.json"],
            },
          },
          {
            gcsSource: {
              uris: ["gs://speakifylk-rag-content/rag-content/b.json"],
            },
          },
        ],
      }),
    });

    await import("./rag-status");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Files:   2");
    expect(output).toContain("fully in sync!");
  });

  // ── Custom env vars ────────────────────────────────────────────────

  it("uses custom RAG_CONTENT_BUCKET and RAG_GCS_PREFIX", async () => {
    process.env.RAG_CONTENT_BUCKET = "custom-bucket";
    process.env.RAG_GCS_PREFIX = "custom-prefix";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ displayName: "C" }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await import("./rag-status");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("custom-bucket");
    expect(output).toContain("custom-prefix/");
  });

  // ── Corpus info with missing fields ────────────────────────────────

  it("handles corpus info with missing displayName and invalid createTime", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Corpus info with missing fields
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ createTime: "invalid-date" }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await import("./rag-status");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("(unnamed)");
    expect(output).toContain("invalid-date");
  });

  // ── RagFiles with empty or missing gcsSource ───────────────────────

  it("handles RagFiles with no gcsSource", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ displayName: "C" }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ragFiles: [{ gcsSource: {} }, {}],
      }),
    });

    await import("./rag-status");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Imported: 0");
  });

  // ── GCS items with missing name ────────────────────────────────────

  it("handles GCS items with missing name", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ displayName: "C" }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ name: "rag-content/a.json" }, {}] }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ragFiles: [
          {
            gcsSource: {
              uris: ["gs://speakifylk-rag-content/rag-content/a.json"],
            },
          },
        ],
      }),
    });

    await import("./rag-status");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Files:   1");
    expect(output).toContain("fully in sync!");
  });

  // ── main().catch ───────────────────────────────────────────────────

  it("catches fatal errors in main()", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    let callCount = 0;
    vi.spyOn(console, "log").mockImplementation(() => {
      callCount++;
      // The 3rd log call is in main() after the header lines; throw to trigger .catch
      if (callCount === 3) {
        throw new Error("fatal log error");
      }
    });
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./rag-status");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Fatal error");
  });

  // ── Non-Error exceptions in catch blocks ───────────────────────────

  it("handles non-Error thrown from corpus info fetch", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Corpus info fetch rejects with a string (non-Error)
    fetchMock.mockRejectedValueOnce("corpus string error");
    // GCS succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    // RagFiles succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await import("./rag-status");
    await flushPromises();

    const errOutput = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(errOutput).toContain("Could not fetch corpus info");
    expect(errOutput).toContain("corpus string error");
  });

  it("handles non-Error thrown from GCS list", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Corpus info succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        displayName: "C",
        createTime: "2025-01-01T00:00:00Z",
      }),
    });
    // GCS rejects with non-Error
    fetchMock.mockRejectedValueOnce("gcs string error");
    // RagFiles succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await import("./rag-status");
    await flushPromises();

    const errOutput = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(errOutput).toContain("Could not list GCS objects");
    expect(errOutput).toContain("gcs string error");
  });

  it("handles non-Error thrown from RagFiles list", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Corpus info succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ displayName: "C" }),
    });
    // GCS succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    // RagFiles rejects with non-Error
    fetchMock.mockRejectedValueOnce("rag string error");

    await import("./rag-status");
    await flushPromises();

    const errOutput = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(errOutput).toContain("Could not list RagFiles");
    expect(errOutput).toContain("rag string error");
  });

  it("handles corpus with valid createTime formatting", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        displayName: "C",
        createTime: "2025-06-15T10:30:00Z",
      }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await import("./rag-status");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    // Valid date should be formatted via toLocaleString, not show the raw string
    expect(output).toContain("Created:");
    // Should NOT contain "invalid-date" since it's a valid date
    expect(output).not.toContain("undefined");
  });

  it("handles GCS prefix without trailing slash", async () => {
    process.env.RAG_GCS_PREFIX = "custom-prefix";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ displayName: "C" }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await import("./rag-status");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("custom-prefix/");
  });
});
