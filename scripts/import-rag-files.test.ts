// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fetchMock = vi.fn();
global.fetch = fetchMock;
vi.mock("../lib/gcp-auth", () => ({
  getAuthHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test" }),
}));

const mockFs = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
};

vi.mock("node:fs/promises", () => mockFs);
const flushPromises = () => new Promise<void>((r) => setTimeout(r, 200));

describe("import-rag-files script", () => {
  const savedEnv = { ...process.env };
  const savedArgv = [...process.argv];

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    fetchMock.mockReset();
    mockFs.readFile.mockRejectedValue(new Error("enoent"));
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);

    process.env.GCP_PROJECT_ID = "pid";
    process.env.GCP_LOCATION = "loc";
    process.env.RAG_CORPUS_ID = "rag_id";
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

  it("imports rag files successfully in force mode", async () => {
    process.argv.push("--force");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    mockFs.readFile.mockResolvedValue(
      JSON.stringify({ version: 1, updatedAt: "", files: {} })
    );

    fetchMock
      // 1. list GCS objects
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/file.json", md5Hash: "hash1" }],
          }),
      })
      // 2. list rag files (for deletion in force mode)
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            ragFiles: [{ name: "corpus/ragFiles/1", gcsSource: { uris: [] } }],
          }),
      })
      // 3. delete rag file
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      })
      // 4. import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Listing gs://");
    expect(output).toContain("Importing batch 1 (1 file(s))");
    expect(mockFs.writeFile).toHaveBeenCalled();
  });

  it("handles no objects found in GCS", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({}),
    });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("No objects found");
  });

  it("runs in diff mode with changed files", async () => {
    process.argv.push("--diff");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Existing manifest has file with old hash
    mockFs.readFile.mockResolvedValue(
      JSON.stringify({
        version: 1,
        updatedAt: "2024-01-01",
        files: {
          "gs://speakifylk-rag-content/rag-content/file.json": {
            md5: "old-hash",
            lastImportedAt: "2024-01-01",
          },
        },
      })
    );

    fetchMock
      // 1. list GCS objects (file has new hash)
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/file.json", md5Hash: "new-hash" }],
          }),
      })
      // 2. list rag files for deleteRagFilesForUris
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            ragFiles: [
              {
                name: "corpus/ragFiles/1",
                gcsSource: {
                  uris: ["gs://speakifylk-rag-content/rag-content/file.json"],
                },
              },
            ],
          }),
      })
      // 3. delete stale rag file
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      })
      // 4. import batch
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("--diff");
    expect(output).toContain("1 file(s) changed");
    expect(output).toContain("removing stale RagFile");
  });

  it("skips import in diff mode when manifest is up to date", async () => {
    process.argv.push("--diff");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Manifest has same hash
    mockFs.readFile.mockResolvedValue(
      JSON.stringify({
        version: 1,
        updatedAt: "2024-01-01",
        files: {
          "gs://speakifylk-rag-content/rag-content/file.json": {
            md5: "same-hash",
            lastImportedAt: "2024-01-01",
          },
        },
      })
    );

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          items: [{ name: "rag-content/file.json", md5Hash: "same-hash" }],
        }),
    });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Manifest is up to date");
    expect(mockFs.writeFile).toHaveBeenCalled();
  });

  it("warns when --force and --diff are combined", async () => {
    process.argv.push("--force", "--diff");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files for delete
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })
      // import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = warnSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("--force");
    expect(output).toContain("--diff is ignored");
  });

  it("handles GCS list API failure", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    // Response must be valid JSON so JSON.parse succeeds and !res.ok check is reached
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({ error: "forbidden" }),
    });

    await import("./import-rag-files");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("GCS list failed");
  });

  it("handles fetchJson non-JSON response on API call", async () => {
    process.argv.push("--force");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    fetchMock
      // list GCS (valid)
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // listAllRagFiles via fetchJson returns non-JSON
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "not-json{{{",
      });

    await import("./import-rag-files");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Non-JSON response");
  });

  it("handles import batch failure", async () => {
    process.argv.push("--force");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    fetchMock
      // list GCS objects
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files for delete
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })
      // import fails (valid JSON so !res.ok is reached in importRagFileBatch)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ error: "import error" }),
      });

    await import("./import-rag-files");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Batch 1 failed");
  });

  it("handles import operation that returns an LRO to poll", async () => {
    process.argv.push("--force");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock
      // list GCS objects
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files (empty)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })
      // import returns LRO
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: "operations/import-1" }),
      })
      // poll LRO: done
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Importing batch 1");
  });

  it("handles operation error in waitForOperation", async () => {
    process.argv.push("--force");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    fetchMock
      // list GCS
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files (empty)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })
      // import returns LRO
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: "operations/import-1" }),
      })
      // poll LRO: done with error
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({ done: true, error: { message: "op failed" } }),
      });

    await import("./import-rag-files");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Fatal error");
  });

  it("handles delete operation returning LRO", async () => {
    process.argv.push("--force");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock
      // list GCS
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files (has one)
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            ragFiles: [{ name: "corpus/ragFiles/1", gcsSource: { uris: [] } }],
          }),
      })
      // delete returns LRO (not done)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: "operations/del-1" }),
      })
      // poll delete LRO: done
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      })
      // import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Deleting 1 existing RagFile");
  });

  it("handles delete API error", async () => {
    process.argv.push("--force");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    fetchMock
      // list GCS
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            ragFiles: [{ name: "corpus/ragFiles/1", gcsSource: { uris: [] } }],
          }),
      })
      // delete fails (valid JSON so !res.ok check is reached)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => JSON.stringify({ error: "delete failed" }),
      });

    await import("./import-rag-files");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("DELETE ragFile");
  });

  it("handles import operation with error field in done response", async () => {
    process.argv.push("--force");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    fetchMock
      // list GCS
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files (empty)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })
      // import returns done with error
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({ done: true, error: { message: "import err" } }),
      });

    await import("./import-rag-files");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("reads manifest with invalid version", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    mockFs.readFile.mockResolvedValue(
      JSON.stringify({ version: 2, files: "invalid" })
    );

    fetchMock
      // list GCS (must return items so readManifest is actually called)
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // import batch
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Importing batch 1");
  });

  it("reads manifest with valid data and missing updatedAt", async () => {
    process.argv.push("--diff");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    mockFs.readFile.mockResolvedValue(
      JSON.stringify({ version: 1, files: {} })
    );

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("--diff");
  });

  it("handles GCS object with crc32c instead of md5Hash", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [
              { name: "rag-content/f1.json", crc32c: "abc123" },
              { name: "rag-content/f2.json", generation: "gen1" },
              { name: "rag-content/f3.json" }, // no hash at all, should be skipped (no fingerprint)
              { name: undefined }, // no name, should be skipped
            ],
          }),
      })
      // import batch
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Importing batch 1");
  });

  it("handles paginated GCS listing", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock
      // first page of GCS objects
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f1.json", md5Hash: "h1" }],
            nextPageToken: "page2",
          }),
      })
      // second page
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f2.json", md5Hash: "h2" }],
          }),
      })
      // import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("2 file(s)");
  });

  it("handles paginated rag files listing in force mode", async () => {
    process.argv.push("--force");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock
      // list GCS
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files page 1
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            ragFiles: [{ name: "corpus/ragFiles/1" }],
            nextPageToken: "p2",
          }),
      })
      // list rag files page 2
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({ ragFiles: [{ name: "corpus/ragFiles/2" }] }),
      })
      // delete file 1
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      })
      // delete file 2
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      })
      // import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Deleting 2 existing RagFile");
  });

  it("uses custom RAG_CONTENT_BUCKET and RAG_GCS_PREFIX", async () => {
    process.env.RAG_CONTENT_BUCKET = "custom-bucket";
    process.env.RAG_GCS_PREFIX = "custom-prefix";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({}),
    });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("custom-bucket");
    expect(output).toContain("custom-prefix/");
  });

  it("uses custom RAG_OP_TIMEOUT_MS env", async () => {
    process.env.RAG_OP_TIMEOUT_MS = "1000";
    process.argv.push("--force");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock
      // list GCS
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files (empty)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })
      // import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Importing batch 1");
  });

  it("falls back to default for invalid RAG_OP_TIMEOUT_MS", async () => {
    process.env.RAG_OP_TIMEOUT_MS = "not-a-number";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({}),
    });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("No objects found");
  });

  it("handles empty text response from fetchJson as empty object", async () => {
    process.argv.push("--force");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock
      // list GCS - empty text
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "",
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("No objects found");
  });

  it("handles delete operation with error field", async () => {
    process.argv.push("--force");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    fetchMock
      // list GCS
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            ragFiles: [{ name: "corpus/ragFiles/1", gcsSource: { uris: [] } }],
          }),
      })
      // delete returns done with error
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({ done: true, error: { message: "del failed" } }),
      });

    await import("./import-rag-files");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("handles diff mode with deleteRagFilesForUris where no rag file matches", async () => {
    process.argv.push("--diff");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    mockFs.readFile.mockResolvedValue(
      JSON.stringify({
        version: 1,
        updatedAt: "2024-01-01",
        files: {},
      })
    );

    fetchMock
      // list GCS (new file)
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/new-file.json", md5Hash: "newhash" }],
          }),
      })
      // list rag files for deleteRagFilesForUris (no match)
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            ragFiles: [
              {
                name: "corpus/ragFiles/1",
                gcsSource: { uris: ["gs://other/file.json"] },
              },
            ],
          }),
      })
      // import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("1 file(s) changed");
  });

  it("handles rag file with no gcsSource.uris (ragFileGcsUris returns empty)", async () => {
    process.argv.push("--diff");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    mockFs.readFile.mockResolvedValue(
      JSON.stringify({
        version: 1,
        updatedAt: "2024-01-01",
        files: {},
      })
    );

    fetchMock
      // list GCS
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files for deleteRagFilesForUris (no uris)
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            ragFiles: [
              { name: "corpus/ragFiles/1", gcsSource: {} },
              { name: "corpus/ragFiles/2" },
            ],
          }),
      })
      // import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("1 file(s) changed");
  });

  it("handles GCS prefix without trailing slash", async () => {
    process.env.RAG_GCS_PREFIX = "my-prefix";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({}),
    });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("my-prefix/");
  });

  it("handles missing required env var (getEnv throws)", async () => {
    process.env.GCP_PROJECT_ID = "";
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          items: [{ name: "rag-content/f.json", md5Hash: "h" }],
        }),
    });

    await import("./import-rag-files");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Missing required environment variable");
  });

  it("handles negative RAG_OP_TIMEOUT_MS", async () => {
    process.env.RAG_OP_TIMEOUT_MS = "-1";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({}),
    });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("No objects found");
  });

  it("handles waitForOperation with polling loop and sleep", async () => {
    process.argv.push("--force");
    process.env.RAG_OP_TIMEOUT_MS = "60000";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock
      // list GCS
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files (empty)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })
      // import returns LRO
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: "operations/import-poll" }),
      })
      // first poll: not done (triggers sleep)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({}),
      })
      // second poll: done
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    // Wait longer to account for OP_POLL_MS (4000ms)
    await new Promise<void>((r) => setTimeout(r, 5000));

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Done.");
  }, 10000);

  it("handles waitForOperation timeout", async () => {
    process.argv.push("--force");
    process.env.RAG_OP_TIMEOUT_MS = "1"; // 1ms timeout to trigger immediately
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    fetchMock
      // list GCS
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files (empty)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })
      // import returns LRO
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: "operations/slow-op" }),
      })
      // first poll: not done (after this the loop will sleep then timeout check)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({}),
      })
      // second poll won't happen because timeout fires first
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    // Wait for the OP_POLL_MS (4000ms) sleep + some buffer
    await new Promise<void>((r) => setTimeout(r, 5000));

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Timed out");
  }, 10000);

  it("handles importRagFileBatch with empty uris (no-op)", async () => {
    process.argv.push("--diff");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Manifest is up to date, no files changed
    mockFs.readFile.mockResolvedValue(
      JSON.stringify({
        version: 1,
        updatedAt: "2024-01-01",
        files: {
          "gs://speakifylk-rag-content/rag-content/f.json": {
            md5: "same",
            lastImportedAt: "2024-01-01",
          },
        },
      })
    );

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          items: [{ name: "rag-content/f.json", md5Hash: "same" }],
        }),
    });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Manifest is up to date");
  });

  it("handles rag file with no name in force deleteAllRagFiles", async () => {
    process.argv.push("--force");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock
      // list GCS
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files - one has name, one doesn't
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            ragFiles: [
              { gcsSource: { uris: [] } }, // no name - should be skipped
              { name: "corpus/ragFiles/1", gcsSource: { uris: [] } },
            ],
          }),
      })
      // delete file 1
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      })
      // import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Deleting 2 existing RagFile");
  });

  it("handles deleteRagFile with empty response text", async () => {
    process.argv.push("--force");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock
      // list GCS
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({ ragFiles: [{ name: "corpus/ragFiles/1" }] }),
      })
      // delete returns empty body (neither done nor LRO name)
      .mockResolvedValueOnce({ ok: true, text: async () => "" })
      // import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Deleting 1 existing RagFile");
  });

  it("handles GCS item with generation fallback (no md5Hash, no crc32c)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [
              { name: "rag-content/f1.json", generation: "12345" },
              { name: "rag-content/f2.json" }, // no hash info at all - gets gen: fallback
              { name: "rag-content/f3.json", md5Hash: "" }, // empty md5Hash is falsy, triggers !fingerprint skip
            ],
          }),
      })
      // import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Importing batch 1");
  });

  it("handles fetchJson with error status and object body", async () => {
    process.argv.push("--force");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    fetchMock
      // list GCS (ok)
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // listAllRagFiles returns error with JSON body
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: { message: "bad request" } }),
      });

    await import("./import-rag-files");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("handles fetchJson with empty text response (returns empty object)", async () => {
    process.argv.push("--force");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock
      // list GCS (ok)
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // listAllRagFiles via fetchJson returns empty text (ok status)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "",
      })
      // import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Deleting 0 existing RagFile");
  });

  it("handles fetchJson with non-object error body (typeof body !== object)", async () => {
    process.argv.push("--force");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    fetchMock
      // list GCS (ok)
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // listAllRagFiles via fetchJson returns a JSON primitive (number) with error status
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "42",
      });

    await import("./import-rag-files");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    // The error message should use `text` instead of JSON.stringify(body) since body is not object
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("42");
  });

  it("handles getOpTimeoutMs returning default for zero value while waitForOperation is called", async () => {
    process.argv.push("--force");
    process.env.RAG_OP_TIMEOUT_MS = "0"; // 0 <= 0, triggers return DEFAULT
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock
      // list GCS
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files (empty)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })
      // import returns LRO (triggers waitForOperation which calls getOpTimeoutMs)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ name: "operations/op1" }),
      })
      // poll: done immediately
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Done.");
  });

  it("handles deleteRagFilesForUris with rag file that has no name", async () => {
    process.argv.push("--diff");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    mockFs.readFile.mockResolvedValue(
      JSON.stringify({
        version: 1,
        updatedAt: "2024-01-01",
        files: {},
      })
    );

    fetchMock
      // list GCS
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files for deleteRagFilesForUris (rag file has no name)
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            ragFiles: [
              {
                gcsSource: {
                  uris: ["gs://speakifylk-rag-content/rag-content/f.json"],
                },
              }, // no name
            ],
          }),
      })
      // import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("1 file(s) changed");
  });

  it("handles importRagFileBatch with empty text response", async () => {
    process.argv.push("--force");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    fetchMock
      // list GCS
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files (empty)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })
      // import returns empty response (ok, empty text)
      .mockResolvedValueOnce({ ok: true, text: async () => "" });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Done.");
  });

  it("handles buildManifest with previous manifest data", async () => {
    process.argv.push("--force");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Previous manifest with existing file data
    mockFs.readFile.mockResolvedValue(
      JSON.stringify({
        version: 1,
        updatedAt: "2024-01-01",
        files: {
          "gs://speakifylk-rag-content/rag-content/existing.json": {
            md5: "old",
            lastImportedAt: "2024-01-01",
          },
        },
      })
    );

    fetchMock
      // list GCS with 2 files (one existing, one new)
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [
              { name: "rag-content/existing.json", md5Hash: "old" },
              { name: "rag-content/new.json", md5Hash: "new" },
            ],
          }),
      })
      // list rag files (empty)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })
      // import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("2 file(s)");
    expect(output).toContain("Done.");
    expect(mockFs.writeFile).toHaveBeenCalled();
  });

  it("handles fetchJson error with non-object body (string from JSON)", async () => {
    process.argv.push("--force");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    fetchMock
      // list GCS (ok)
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // listAllRagFiles returns a JSON string (not object) with error status
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => '"just a string"',
      });

    await import("./import-rag-files");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Fatal error");
  });

  it("handles deleteRagFilesForUris with empty targetUris set (early return)", async () => {
    process.argv.push("--diff");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Manifest has no files, so there's nothing in manifest
    mockFs.readFile.mockResolvedValue(
      JSON.stringify({
        version: 1,
        updatedAt: "2024-01-01",
        files: {
          "gs://speakifylk-rag-content/rag-content/f.json": {
            md5: "old-hash",
            lastImportedAt: "2024-01-01",
          },
        },
      })
    );

    fetchMock
      // list GCS (file with changed hash)
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "new-hash" }],
          }),
      })
      // list rag files for deleteRagFilesForUris (empty - no rag files to delete)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({}),
      })
      // import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("1 file(s) changed");
  });

  it("diff mode up-to-date with file missing lastImportedAt (fallback to importTime)", async () => {
    process.argv.push("--diff");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Manifest has file with same hash but no lastImportedAt
    mockFs.readFile.mockResolvedValue(
      JSON.stringify({
        version: 1,
        updatedAt: "2024-01-01",
        files: {
          "gs://speakifylk-rag-content/rag-content/f.json": {
            md5: "same",
          },
        },
      })
    );

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          items: [{ name: "rag-content/f.json", md5Hash: "same" }],
        }),
    });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Manifest is up to date");
    expect(mockFs.writeFile).toHaveBeenCalled();
  });

  it("buildManifest assigns importTime for new files not in previous manifest", async () => {
    process.argv.push("--force");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    mockFs.writeFile.mockClear();

    // Previous manifest with NO file entries
    mockFs.readFile.mockResolvedValue(
      JSON.stringify({ version: 1, updatedAt: "2024-01-01", files: {} })
    );

    fetchMock
      // list GCS with a file that has no prev entry
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/brand-new.json", md5Hash: "h1" }],
          }),
      })
      // list rag files (empty)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })
      // import
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ done: true }),
      });

    await import("./import-rag-files");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Done.");
    // Verify manifest was written with the new file
    const writeCall = mockFs.writeFile.mock.calls[0];
    const manifestContent = JSON.parse(writeCall[1] as string);
    // The key is gs://<bucket>/<object-name>
    const fileKeys = Object.keys(manifestContent.files);
    expect(fileKeys.length).toBe(1);
    const entry = manifestContent.files[fileKeys[0]];
    expect(entry).toBeDefined();
    expect(entry.md5).toBe("h1");
    expect(entry.lastImportedAt).toBeDefined();
  });

  it("handles importRagFileBatch error status after POST", async () => {
    process.argv.push("--force");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    fetchMock
      // list GCS
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            items: [{ name: "rag-content/f.json", md5Hash: "h" }],
          }),
      })
      // list rag files (empty)
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })
      // import returns NOT OK status (valid JSON body so !res.ok is reached)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: "bad request body" }),
      });

    await import("./import-rag-files");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Batch 1 failed");
  });
});
