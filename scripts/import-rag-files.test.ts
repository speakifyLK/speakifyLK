// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import path from "node:path";

/* ------------------------------------------------------------------ */
/*  Hoisted mocks                                                     */
/* ------------------------------------------------------------------ */

const { mockGetAuthHeaders, mockPrintRagStatusReport } = vi.hoisted(() => ({
  mockGetAuthHeaders: vi.fn().mockResolvedValue({ Authorization: "Bearer test-token" }),
  mockPrintRagStatusReport: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../lib/gcp-auth", () => ({
  getAuthHeaders: mockGetAuthHeaders,
}));

vi.mock("../lib/rag-import-status", () => ({
  printRagStatus: mockPrintRagStatusReport,
}));

const mockFs = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
};
vi.mock("node:fs/promises", () => mockFs);

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function jsonResponse(data: unknown, ok = true, status?: number): Response {
  return new Response(JSON.stringify(data), {
    status: status ?? (ok ? 200 : 500),
    headers: { "Content-Type": "application/json" },
  });
}

function gcsListResponse(
  items: {
    name?: string;
    md5Hash?: string;
    crc32c?: string;
    generation?: string;
  }[],
  nextPageToken?: string
) {
  return jsonResponse({ items, ...(nextPageToken ? { nextPageToken } : {}) });
}

function ragFilesResponse(ragFiles: Record<string, unknown>[], nextPageToken?: string) {
  return jsonResponse({
    ragFiles,
    ...(nextPageToken ? { nextPageToken } : {}),
  });
}

function opDone(error?: unknown) {
  return jsonResponse({ done: true, ...(error ? { error } : {}) });
}

function opPending(name?: string) {
  return jsonResponse(name ? { name } : {});
}

const scriptEntryPath = path.resolve(process.cwd(), "scripts/import-rag-files.ts");

/* ------------------------------------------------------------------ */
/*  Test suite                                                        */
/* ------------------------------------------------------------------ */

describe("import-rag-files", () => {
  const savedArgv = process.argv.slice();
  const savedEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  let main: () => Promise<void>;
  let isExecutedAsCli: () => boolean;

  beforeAll(async () => {
    const mod = await import("./import-rag-files");
    main = mod.main;
    isExecutedAsCli = mod.isExecutedAsCli;
  });

  beforeEach(() => {
    process.env.GCP_PROJECT_ID = "proj";
    process.env.GCP_LOCATION = "us-central1";
    process.env.RAG_CORPUS_ID = "corpus1";
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      type: "service_account",
      project_id: "proj",
    });
    process.env.RAG_CONTENT_BUCKET = "";
    process.env.RAG_GCS_PREFIX = "";
    process.env.RAG_OP_TIMEOUT_MS = "";

    process.argv = ["node", scriptEntryPath];

    mockGetAuthHeaders.mockClear();
    mockPrintRagStatusReport.mockClear();
    mockFs.readFile.mockReset().mockRejectedValue(new Error("ENOENT"));
    mockFs.writeFile.mockReset().mockResolvedValue(undefined);
    mockFs.mkdir.mockReset().mockResolvedValue(undefined);

    globalThis.fetch = vi.fn() as typeof fetch;
  });

  afterEach(() => {
    process.argv = savedArgv.slice();
    process.env = { ...savedEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const fetchMock = () => globalThis.fetch as ReturnType<typeof vi.fn>;

  /* ======== --status mode ======== */

  describe("--status mode", () => {
    it("delegates to printRagStatusReport", async () => {
      process.argv = ["node", scriptEntryPath, "--status"];
      await main();
      expect(mockPrintRagStatusReport).toHaveBeenCalledTimes(1);
      const deps = mockPrintRagStatusReport.mock.calls[0][0];
      expect(deps.corpusParent).toBe("projects/proj/locations/us-central1/ragCorpora/corpus1");
      expect(typeof deps.listRagFiles).toBe("function");
      expect(typeof deps.listChunkCount).toBe("function");
      expect(typeof deps.log).toBe("function");
    });

    it("warns when --status is combined with --force", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      process.argv = ["node", scriptEntryPath, "--status", "--force"];
      await main();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("--status ignores"));
    });

    it("warns when --status is combined with --diff", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      process.argv = ["node", scriptEntryPath, "--status", "--diff"];
      await main();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("--status ignores"));
    });

    it("warns when --status combined with both --force and --diff", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      process.argv = ["node", scriptEntryPath, "--status", "--force", "--diff"];
      await main();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("--status ignores"));
      expect(mockPrintRagStatusReport).toHaveBeenCalledTimes(1);
    });
  });

  /* ======== No-flags (default) import ======== */

  describe("default (no flags) import", () => {
    it("imports all GCS objects successfully", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/a.json", md5Hash: "h1" }]))
        .mockResolvedValueOnce(opDone()); // import batch

      await main();

      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it("logs 'No objects found' when GCS returns empty", async () => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      fetchMock().mockResolvedValueOnce(jsonResponse({}));

      await main();

      expect(log).toHaveBeenCalledWith("No objects found under prefix. Nothing to import.");
    });

    it("uses default bucket and prefix", async () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      fetchMock().mockResolvedValueOnce(jsonResponse({}));

      await main();

      const url = (fetchMock() as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain("speakifylk-rag-content");
      expect(url).toContain("prefix=rag-content%2F");
    });
  });

  /* ======== --force mode ======== */

  describe("--force mode", () => {
    beforeEach(() => {
      process.argv = ["node", scriptEntryPath, "--force"];
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    });

    it("deletes all rag files then imports", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h1" }]))
        .mockResolvedValueOnce(
          ragFilesResponse([{ name: "corpus/ragFiles/1", gcsSource: { uris: [] } }])
        )
        .mockResolvedValueOnce(opDone()) // delete
        .mockResolvedValueOnce(opDone()); // import

      await main();

      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it("warns when combined with --diff", async () => {
      process.argv = ["node", scriptEntryPath, "--force", "--diff"];
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(jsonResponse({})) // list rag files (empty)
        .mockResolvedValueOnce(opDone()); // import

      await main();

      expect(warn).toHaveBeenCalledWith(expect.stringContaining("--diff is ignored"));
    });

    it("skips rag files with no name in deleteAllRagFiles", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(
          ragFilesResponse([
            { gcsSource: { uris: [] } }, // no name — skipped
            { name: "corpus/ragFiles/1", gcsSource: { uris: [] } },
          ])
        )
        .mockResolvedValueOnce(opDone()) // delete file 1
        .mockResolvedValueOnce(opDone()); // import

      await main();

      // Only 1 delete call should have been made (skipped the unnamed one)
      const calls = (fetchMock() as ReturnType<typeof vi.fn>).mock.calls;
      const deleteCalls = calls.filter(
        (c: unknown[]) =>
          typeof c[1] === "object" &&
          c[1] !== null &&
          (c[1] as Record<string, unknown>).method === "DELETE"
      );
      expect(deleteCalls.length).toBe(1);
    });

    it("handles paginated rag files in deleteAllRagFiles", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(ragFilesResponse([{ name: "corpus/ragFiles/1" }], "p2"))
        .mockResolvedValueOnce(ragFilesResponse([{ name: "corpus/ragFiles/2" }]))
        .mockResolvedValueOnce(opDone()) // delete 1
        .mockResolvedValueOnce(opDone()) // delete 2
        .mockResolvedValueOnce(opDone()); // import

      await main();

      const log = vi.mocked(console.log);
      const output = log.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("Deleting 2 existing RagFile");
    });

    it("handles delete returning an LRO", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(
          ragFilesResponse([{ name: "corpus/ragFiles/1", gcsSource: { uris: [] } }])
        )
        .mockResolvedValueOnce(opPending("operations/del-1")) // delete LRO
        .mockResolvedValueOnce(opDone()) // poll delete
        .mockResolvedValueOnce(opDone()); // import

      await main();
    });

    it("handles delete returning empty body (no LRO, not done)", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(ragFilesResponse([{ name: "corpus/ragFiles/1" }]))
        .mockResolvedValueOnce(new Response("", { status: 200 })) // delete: empty body
        .mockResolvedValueOnce(opDone()); // import

      await main();
    });

    it("throws on delete API error", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(
          ragFilesResponse([{ name: "corpus/ragFiles/1", gcsSource: { uris: [] } }])
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "delete failed" }), {
            status: 500,
          })
        );

      await expect(main()).rejects.toThrow("DELETE ragFile");
    });

    it("throws on delete operation done with error", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(
          ragFilesResponse([{ name: "corpus/ragFiles/1", gcsSource: { uris: [] } }])
        )
        .mockResolvedValueOnce(opDone({ message: "del failed" }));

      await expect(main()).rejects.toThrow("Delete failed");
    });

    it("handles import returning an LRO", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(jsonResponse({})) // list rag files empty
        .mockResolvedValueOnce(opPending("operations/imp-1")) // import LRO
        .mockResolvedValueOnce(opDone()); // poll

      await main();
    });

    it("throws on import done with error", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(jsonResponse({})) // list rag files
        .mockResolvedValueOnce(opDone({ message: "import err" }));

      await expect(main()).rejects.toThrow("Import failed");
    });

    it("throws on import API error status", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(new Response(JSON.stringify({ error: "bad" }), { status: 500 }));

      await expect(main()).rejects.toThrow("import");
    });

    it("logs batch failure with ❌ before re-throwing", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(new Response(JSON.stringify({ error: "bad" }), { status: 500 }));

      await expect(main()).rejects.toThrow();
      expect(errSpy).toHaveBeenCalledWith("  ❌ Batch 1 failed");
    });

    it("writes manifest with correct entries after import", async () => {
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

      fetchMock()
        .mockResolvedValueOnce(
          gcsListResponse([
            { name: "rag-content/existing.json", md5Hash: "old" },
            { name: "rag-content/new.json", md5Hash: "new" },
          ])
        )
        .mockResolvedValueOnce(jsonResponse({})) // list rag files (empty)
        .mockResolvedValueOnce(opDone()); // import

      await main();

      const writeCall = mockFs.writeFile.mock.calls[0];
      const manifest = JSON.parse(writeCall[1] as string);
      expect(Object.keys(manifest.files).length).toBe(2);
    });

    it("produces 'Done.' with correct entry count (singular)", async () => {
      const log = vi.mocked(console.log);

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(opDone());

      await main();

      const output = log.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("Done.");
      expect(output).toContain("1 entry");
    });

    it("produces 'entries' for multiple files", async () => {
      const log = vi.mocked(console.log);

      fetchMock()
        .mockResolvedValueOnce(
          gcsListResponse([
            { name: "rag-content/a.json", md5Hash: "h1" },
            { name: "rag-content/b.json", md5Hash: "h2" },
          ])
        )
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(opDone());

      await main();

      const output = log.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("2 entries");
    });
  });

  /* ======== --diff mode ======== */

  describe("--diff mode", () => {
    beforeEach(() => {
      process.argv = ["node", scriptEntryPath, "--diff"];
      vi.spyOn(console, "log").mockImplementation(() => {});
    });

    it("imports only changed files", async () => {
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

      fetchMock()
        .mockResolvedValueOnce(
          gcsListResponse([{ name: "rag-content/f.json", md5Hash: "new-hash" }])
        )
        .mockResolvedValueOnce(
          ragFilesResponse([
            {
              name: "corpus/ragFiles/1",
              gcsSource: {
                uris: ["gs://speakifylk-rag-content/rag-content/f.json"],
              },
            },
          ])
        )
        .mockResolvedValueOnce(opDone()) // delete stale
        .mockResolvedValueOnce(opDone()); // import

      await main();

      const log = vi.mocked(console.log);
      const output = log.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("1 file(s) changed");
      expect(output).toContain("removing stale RagFile");
    });

    it("skips import when manifest is up to date", async () => {
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

      fetchMock().mockResolvedValueOnce(
        gcsListResponse([{ name: "rag-content/f.json", md5Hash: "same" }])
      );

      await main();

      const log = vi.mocked(console.log);
      const output = log.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("Manifest is up to date");
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it("up-to-date path uses prev.lastImportedAt fallback when missing", async () => {
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({
          version: 1,
          updatedAt: "2024-01-01",
          files: {
            "gs://speakifylk-rag-content/rag-content/f.json": { md5: "same" },
          },
        })
      );

      fetchMock().mockResolvedValueOnce(
        gcsListResponse([{ name: "rag-content/f.json", md5Hash: "same" }])
      );

      await main();

      const log = vi.mocked(console.log);
      const output = log.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("Manifest is up to date");
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it("deleteRagFilesForUris skips rag files with no name", async () => {
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({ version: 1, updatedAt: "2024-01-01", files: {} })
      );

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(
          ragFilesResponse([
            {
              gcsSource: {
                uris: ["gs://speakifylk-rag-content/rag-content/f.json"],
              },
            }, // no name
          ])
        )
        .mockResolvedValueOnce(opDone()); // import

      await main();

      const log = vi.mocked(console.log);
      const output = log.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("1 file(s) changed");
    });

    it("deleteRagFilesForUris handles rag file with no matching URIs", async () => {
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({ version: 1, updatedAt: "2024-01-01", files: {} })
      );

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(
          ragFilesResponse([
            {
              name: "corpus/ragFiles/1",
              gcsSource: { uris: ["gs://other/file.json"] },
            },
          ])
        )
        .mockResolvedValueOnce(opDone()); // import

      await main();
    });

    it("handles rag file with no gcsSource or empty uris", async () => {
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({ version: 1, updatedAt: "2024-01-01", files: {} })
      );

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(
          ragFilesResponse([
            { name: "corpus/ragFiles/1", gcsSource: {} },
            { name: "corpus/ragFiles/2" },
          ])
        )
        .mockResolvedValueOnce(opDone()); // import

      await main();
    });
  });

  /* ======== GCS listing edge cases ======== */

  describe("GCS listing", () => {
    beforeEach(() => {
      vi.spyOn(console, "log").mockImplementation(() => {});
    });

    it("handles paginated GCS listing", async () => {
      fetchMock()
        .mockResolvedValueOnce(
          gcsListResponse([{ name: "rag-content/f1.json", md5Hash: "h1" }], "page2")
        )
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f2.json", md5Hash: "h2" }]))
        .mockResolvedValueOnce(opDone()); // import

      await main();

      const log = vi.mocked(console.log);
      const output = log.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("2 file(s)");
    });

    it("handles objects with crc32c instead of md5Hash", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", crc32c: "abc123" }]))
        .mockResolvedValueOnce(opDone());

      await main();
    });

    it("handles objects with generation fallback", async () => {
      fetchMock()
        .mockResolvedValueOnce(
          gcsListResponse([{ name: "rag-content/f.json", generation: "12345" }])
        )
        .mockResolvedValueOnce(opDone());

      await main();
    });

    it("handles objects with empty generation (gen: fallback)", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json" }]))
        .mockResolvedValueOnce(opDone());

      await main();
    });

    it("skips objects with no name", async () => {
      fetchMock()
        .mockResolvedValueOnce(
          gcsListResponse([{ md5Hash: "h" } as { name?: string; md5Hash?: string }])
        )
        .mockResolvedValueOnce(jsonResponse({})); // actually hits "No objects"

      await main();

      const log = vi.mocked(console.log);
      const output = log.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("No objects found");
    });

    it("skips objects where md5Hash is empty string (no fingerprint)", async () => {
      fetchMock().mockResolvedValueOnce(
        gcsListResponse([{ name: "rag-content/f.json", md5Hash: "" }])
      );

      await main();

      const log = vi.mocked(console.log);
      const output = log.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("No objects found");
    });

    it("throws on GCS list API failure", async () => {
      fetchMock().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })
      );

      await expect(main()).rejects.toThrow("GCS list failed");
    });

    it("handles GCS empty text response", async () => {
      fetchMock().mockResolvedValueOnce(new Response("", { status: 200 }));

      await main();

      const log = vi.mocked(console.log);
      const output = log.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("No objects found");
    });
  });

  /* ======== fetchJson edge cases ======== */

  describe("fetchJson", () => {
    beforeEach(() => {
      process.argv = ["node", scriptEntryPath, "--force"];
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    });

    it("throws Non-JSON error when response is not valid JSON", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(new Response("not-json{{{", { status: 200 }));

      await expect(main()).rejects.toThrow("Non-JSON response");
    });

    it("throws with JSON.stringify(body) when error body is an object", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: { message: "bad request" } }), {
            status: 400,
          })
        );

      await expect(main()).rejects.toThrow("400");
    });

    it("throws with text when error body is not an object (number)", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(new Response("42", { status: 500 }));

      await expect(main()).rejects.toThrow("42");
    });

    it("throws with text when error body is a JSON string", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(new Response('"just a string"', { status: 400 }));

      await expect(main()).rejects.toThrow("400");
    });

    it("handles empty text response as empty object", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(new Response("", { status: 200 })) // listAllRagFiles empty
        .mockResolvedValueOnce(opDone()); // import

      await main();

      const log = vi.mocked(console.log);
      const output = log.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("Deleting 0 existing RagFile");
    });
  });

  /* ======== waitForOperation ======== */

  describe("waitForOperation", () => {
    beforeEach(() => {
      process.argv = ["node", scriptEntryPath, "--force"];
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    });

    it("polls until done", async () => {
      process.env.RAG_OP_TIMEOUT_MS = "60000";

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(jsonResponse({})) // empty rag files
        .mockResolvedValueOnce(opPending("operations/imp-1")) // import returns LRO
        .mockResolvedValueOnce(jsonResponse({})) // poll: not done
        .mockResolvedValueOnce(opDone()); // poll: done

      await main();

      const log = vi.mocked(console.log);
      const output = log.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("Done.");
    }, 10000);

    it("throws on operation error", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(opPending("operations/imp-1"))
        .mockResolvedValueOnce(opDone({ message: "op failed" }));

      await expect(main()).rejects.toThrow("Operation failed");
    });

    it("throws on timeout", async () => {
      process.env.RAG_OP_TIMEOUT_MS = "1"; // 1ms

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(opPending("operations/slow"))
        .mockResolvedValueOnce(jsonResponse({})) // not done
        .mockResolvedValueOnce(opDone()); // never reached

      await expect(main()).rejects.toThrow("Timed out");
    }, 10000);
  });

  /* ======== Environment helpers ======== */

  describe("environment helpers", () => {
    beforeEach(() => {
      vi.spyOn(console, "log").mockImplementation(() => {});
    });

    it("getEnv throws for missing env var", async () => {
      process.env.GCP_PROJECT_ID = "";

      fetchMock().mockResolvedValueOnce(
        gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }])
      );

      await expect(main()).rejects.toThrow("Missing required environment variable");
    });

    it("uses custom RAG_CONTENT_BUCKET", async () => {
      process.env.RAG_CONTENT_BUCKET = "custom-bucket";
      fetchMock().mockResolvedValueOnce(jsonResponse({}));

      await main();

      const log = vi.mocked(console.log);
      const output = log.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("custom-bucket");
    });

    it("uses custom RAG_GCS_PREFIX", async () => {
      process.env.RAG_GCS_PREFIX = "custom-prefix";
      fetchMock().mockResolvedValueOnce(jsonResponse({}));

      await main();

      const log = vi.mocked(console.log);
      const output = log.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("custom-prefix/");
    });

    it("appends trailing slash to prefix if missing", async () => {
      process.env.RAG_GCS_PREFIX = "no-slash";
      fetchMock().mockResolvedValueOnce(jsonResponse({}));

      await main();

      const url = (fetchMock() as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      expect(url).toContain("prefix=no-slash%2F");
    });

    it("getOpTimeoutMs returns custom value from env", async () => {
      process.argv = ["node", scriptEntryPath, "--force"];
      process.env.RAG_OP_TIMEOUT_MS = "5000";
      vi.spyOn(process.stdout, "write").mockImplementation(() => true);

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(opDone());

      await main();
    });

    it("getOpTimeoutMs falls back for invalid (non-numeric) env", async () => {
      process.env.RAG_OP_TIMEOUT_MS = "not-a-number";
      fetchMock().mockResolvedValueOnce(jsonResponse({}));

      await main();
    });

    it("getOpTimeoutMs falls back for negative env value", async () => {
      process.env.RAG_OP_TIMEOUT_MS = "-1";
      fetchMock().mockResolvedValueOnce(jsonResponse({}));

      await main();
    });

    it("getOpTimeoutMs falls back for zero env value", async () => {
      process.argv = ["node", scriptEntryPath, "--force"];
      process.env.RAG_OP_TIMEOUT_MS = "0";
      vi.spyOn(process.stdout, "write").mockImplementation(() => true);

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(opPending("operations/op1"))
        .mockResolvedValueOnce(opDone());

      await main();
    });
  });

  /* ======== Manifest reading/writing ======== */

  describe("manifest handling", () => {
    beforeEach(() => {
      vi.spyOn(console, "log").mockImplementation(() => {});
    });

    it("handles manifest with invalid version", async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({ version: 2, files: "invalid" }));

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(opDone());

      await main();
    });

    it("handles manifest with valid version but missing updatedAt", async () => {
      process.argv = ["node", scriptEntryPath, "--diff"];
      mockFs.readFile.mockResolvedValue(JSON.stringify({ version: 1, files: {} }));

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(jsonResponse({})) // listAllRagFiles for deleteRagFilesForUris
        .mockResolvedValueOnce(opDone()); // import

      await main();
    });

    it("handles manifest read error (falls back to empty)", async () => {
      mockFs.readFile.mockRejectedValue(new Error("ENOENT"));

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(opDone());

      await main();
    });

    it("buildManifest preserves previous lastImportedAt for non-imported files", async () => {
      process.argv = ["node", scriptEntryPath, "--force"];
      vi.spyOn(process.stdout, "write").mockImplementation(() => true);

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

      fetchMock()
        .mockResolvedValueOnce(
          gcsListResponse([
            { name: "rag-content/existing.json", md5Hash: "old" },
            { name: "rag-content/new.json", md5Hash: "new" },
          ])
        )
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(opDone());

      await main();

      const writeCall = mockFs.writeFile.mock.calls[0];
      const manifest = JSON.parse(writeCall[1] as string);
      expect(Object.keys(manifest.files).length).toBe(2);
    });

    it("buildManifest assigns importTime for brand new files not in prev", async () => {
      process.argv = ["node", scriptEntryPath, "--force"];
      vi.spyOn(process.stdout, "write").mockImplementation(() => true);

      mockFs.readFile.mockResolvedValue(
        JSON.stringify({ version: 1, updatedAt: "2024-01-01", files: {} })
      );

      fetchMock()
        .mockResolvedValueOnce(
          gcsListResponse([{ name: "rag-content/brand-new.json", md5Hash: "h1" }])
        )
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(opDone());

      await main();

      const writeCall = mockFs.writeFile.mock.calls[0];
      const manifest = JSON.parse(writeCall[1] as string);
      const keys = Object.keys(manifest.files);
      expect(keys.length).toBe(1);
      expect(manifest.files[keys[0]].md5).toBe("h1");
      expect(manifest.files[keys[0]].lastImportedAt).toBeDefined();
    });
  });

  /* ======== listRagChunkCountForFile (exercised via --status deps) ======== */

  describe("listRagChunkCountForFile", () => {
    it("counts chunks across pages", async () => {
      process.argv = ["node", scriptEntryPath, "--status"];

      // Capture the deps passed to printRagStatusReport
      let capturedDeps: {
        listChunkCount: (name: string) => Promise<number | null>;
      };
      mockPrintRagStatusReport.mockImplementation(
        async (deps: { listChunkCount: (name: string) => Promise<number | null> }) => {
          capturedDeps = deps;
        }
      );

      await main();

      // Now call listChunkCount directly (it's listRagChunkCountForFile)
      fetchMock()
        .mockResolvedValueOnce(jsonResponse({ ragChunks: [{ id: "1" }], nextPageToken: "t2" }))
        .mockResolvedValueOnce(jsonResponse({ ragChunks: [{ id: "2" }, { id: "3" }] }));

      const count = await capturedDeps!.listChunkCount("some/ragFile/name");
      expect(count).toBe(3);
    });

    it("returns null on error", async () => {
      process.argv = ["node", scriptEntryPath, "--status"];

      let capturedDeps: {
        listChunkCount: (name: string) => Promise<number | null>;
      };
      mockPrintRagStatusReport.mockImplementation(
        async (deps: { listChunkCount: (name: string) => Promise<number | null> }) => {
          capturedDeps = deps;
        }
      );

      await main();

      // Make fetchJson throw
      fetchMock().mockResolvedValueOnce(new Response("server error", { status: 500 }));

      const count = await capturedDeps!.listChunkCount("some/ragFile/name");
      expect(count).toBeNull();
    });

    it("returns 0 when no chunks exist", async () => {
      process.argv = ["node", scriptEntryPath, "--status"];

      let capturedDeps: {
        listChunkCount: (name: string) => Promise<number | null>;
      };
      mockPrintRagStatusReport.mockImplementation(
        async (deps: { listChunkCount: (name: string) => Promise<number | null> }) => {
          capturedDeps = deps;
        }
      );

      await main();

      fetchMock().mockResolvedValueOnce(jsonResponse({}));

      const count = await capturedDeps!.listChunkCount("some/ragFile/name");
      expect(count).toBe(0);
    });
  });

  /* ======== listAllRagFiles (exercised via --status deps) ======== */

  describe("listAllRagFiles via --status deps", () => {
    it("paginates rag files", async () => {
      process.argv = ["node", scriptEntryPath, "--status"];

      let capturedDeps: {
        listRagFiles: () => Promise<unknown[]>;
      };
      mockPrintRagStatusReport.mockImplementation(
        async (deps: { listRagFiles: () => Promise<unknown[]> }) => {
          capturedDeps = deps;
        }
      );

      await main();

      fetchMock()
        .mockResolvedValueOnce(
          jsonResponse({
            ragFiles: [{ name: "f1" }],
            nextPageToken: "p2",
          })
        )
        .mockResolvedValueOnce(jsonResponse({ ragFiles: [{ name: "f2" }] }));

      const files = await capturedDeps!.listRagFiles();
      expect(files).toHaveLength(2);
    });
  });

  /* ======== isExecutedAsCli ======== */

  describe("isExecutedAsCli", () => {
    it("returns false when argv[1] is missing", () => {
      process.argv = ["node"];
      expect(isExecutedAsCli()).toBe(false);
    });

    it("returns false for a different script path", () => {
      process.argv = ["node", path.join(process.cwd(), "package.json")];
      expect(isExecutedAsCli()).toBe(false);
    });

    it("returns true when argv[1] matches the script", () => {
      process.argv = ["node", scriptEntryPath];
      expect(isExecutedAsCli()).toBe(true);
    });
  });

  /* ======== Batching ======== */

  describe("import batching", () => {
    beforeEach(() => {
      process.argv = ["node", scriptEntryPath];
      vi.spyOn(console, "log").mockImplementation(() => {});
    });

    it("batches imports in groups of 20", async () => {
      const items = Array.from({ length: 25 }, (_, i) => ({
        name: `rag-content/f${i}.json`,
        md5Hash: `h${i}`,
      }));

      fetchMock()
        .mockResolvedValueOnce(gcsListResponse(items))
        .mockResolvedValueOnce(opDone()) // batch 1 (20 files)
        .mockResolvedValueOnce(opDone()); // batch 2 (5 files)

      await main();

      const log = vi.mocked(console.log);
      const output = log.mock.calls.map((c) => c.join(" ")).join("\n");
      expect(output).toContain("batch 1 (20 file(s))");
      expect(output).toContain("batch 2 (5 file(s))");
    });
  });

  /* ======== importRagFileBatch error status after POST ======== */

  describe("importRagFileBatch", () => {
    beforeEach(() => {
      process.argv = ["node", scriptEntryPath, "--force"];
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    });

    it("throws on POST error status (not ok)", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(jsonResponse({})) // list rag files
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "bad request" }), {
            status: 400,
          })
        );

      await expect(main()).rejects.toThrow("import");
    });

    it("handles import with empty text response (no LRO, not done)", async () => {
      fetchMock()
        .mockResolvedValueOnce(gcsListResponse([{ name: "rag-content/f.json", md5Hash: "h" }]))
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(new Response("", { status: 200 }));

      await main();
    });
  });
});
