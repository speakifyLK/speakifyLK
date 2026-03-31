import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock gcp-auth dependency
vi.mock("@/lib/gcp-auth", () => ({
  getAuthHeaders: vi.fn(),
}));

import { getAuthHeaders } from "@/lib/gcp-auth";

const mockGetAuthHeaders = vi.mocked(getAuthHeaders);

// Helper to create a mock fetch Response
function mockResponse(
  status: number,
  body: unknown,
  opts?: { ok?: boolean; bodyStream?: ReadableStream<Uint8Array> }
): Response {
  const ok = opts?.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    body: opts?.bodyStream ?? null,
  } as unknown as Response;
}

describe("vertex-rag module", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetAuthHeaders.mockResolvedValue({ Authorization: "Bearer mock-token" });

    process.env.GCP_PROJECT_ID = "test-project";
    process.env.GCP_LOCATION = "us-west1";
    process.env.RAG_CORPUS_ID = "test-corpus";
  });

  describe("retrieveContext", () => {
    it("returns empty array when RAG_CORPUS_ID is not set", async () => {
      delete process.env.RAG_CORPUS_ID;
      const { retrieveContext } = await import("./vertex-rag");
      const result = await retrieveContext("hello");
      expect(result).toEqual([]);
    });

    it("returns empty array when fetch response is not ok", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(500, "error", { ok: false })));
      const { retrieveContext } = await import("./vertex-rag");
      const result = await retrieveContext("hello");
      expect(result).toEqual([]);
    });

    it("returns mapped chunks when fetch succeeds", async () => {
      const responseBody = {
        contexts: {
          contexts: [
            { text: "Sinhala greeting", sourceUri: "gs://bucket/file.txt", score: 0.9 },
            { text: "Another chunk", sourceUri: "gs://bucket/file2.txt", score: 0.75 },
          ],
        },
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, responseBody)));
      const { retrieveContext } = await import("./vertex-rag");
      const result = await retrieveContext("greetings");
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        text: "Sinhala greeting",
        source: "gs://bucket/file.txt",
        score: 0.9,
      });
      expect(result[1]).toEqual({
        text: "Another chunk",
        source: "gs://bucket/file2.txt",
        score: 0.75,
      });
    });

    it("returns empty array when response has no contexts", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, {})));
      const { retrieveContext } = await import("./vertex-rag");
      const result = await retrieveContext("query");
      expect(result).toEqual([]);
    });

    it("fills in defaults for missing chunk fields", async () => {
      const responseBody = {
        contexts: {
          contexts: [
            {
              /* no text, no sourceUri, no score */
            },
          ],
        },
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, responseBody)));
      const { retrieveContext } = await import("./vertex-rag");
      const result = await retrieveContext("query");
      expect(result[0]).toEqual({ text: "", source: "unknown", score: 0 });
    });

    it("returns empty array and does not throw on fetch error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network failure")));
      const { retrieveContext } = await import("./vertex-rag");
      await expect(retrieveContext("query")).resolves.toEqual([]);
    });

    it("uses a custom corpusId when provided", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(200, {})));
      const { retrieveContext } = await import("./vertex-rag");
      await retrieveContext("query", "custom-corpus-id");
      const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
      expect(calledUrl).toContain("retrieveContexts");
      const calledBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(calledBody.vertex_rag_store.rag_resources[0].rag_corpus).toContain("custom-corpus-id");
    });
  });

  describe("generateWithRAG", () => {
    function makeSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
      const encoder = new TextEncoder();
      return new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });
    }

    it("throws when Vertex AI API returns non-ok response", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          // First call: retrieveContext succeeds with empty
          .mockResolvedValueOnce(mockResponse(200, {}))
          // Second call: generateWithRAG fails
          .mockResolvedValueOnce(mockResponse(500, "error", { ok: false }))
      );
      const { generateWithRAG } = await import("./vertex-rag");
      await expect(
        generateWithRAG([{ role: "user", content: "hello" }], "system prompt")
      ).rejects.toThrow("Vertex AI API error");
    });

    it("throws when response has no body stream", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(mockResponse(200, {}))
          .mockResolvedValueOnce({ ok: true, status: 200, body: null } as Response)
      );
      const { generateWithRAG } = await import("./vertex-rag");
      await expect(generateWithRAG([{ role: "user", content: "hi" }], "system")).rejects.toThrow(
        "No response stream from Vertex AI"
      );
    });

    it("returns a ReadableStream when successful", async () => {
      const sseData = `data: ${JSON.stringify({
        candidates: [{ content: { parts: [{ text: "hello" }] } }],
      })}\n\n`;
      const bodyStream = makeSSEStream([sseData]);

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(mockResponse(200, {}))
          .mockResolvedValueOnce({ ok: true, status: 200, body: bodyStream } as Response)
      );
      const { generateWithRAG } = await import("./vertex-rag");
      const stream = await generateWithRAG([{ role: "user", content: "hello" }], "system prompt");
      expect(stream).toBeInstanceOf(ReadableStream);
    });

    it("injects RAG context into system prompt when chunks are retrieved", async () => {
      const ragResponse = {
        contexts: {
          contexts: [{ text: "RAG chunk content", sourceUri: "gs://bucket/f.txt", score: 0.9 }],
        },
      };
      const sseData = `data: ${JSON.stringify({
        candidates: [{ content: { parts: [{ text: "response" }] } }],
      })}\n\n`;
      const bodyStream = makeSSEStream([sseData]);

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(mockResponse(200, ragResponse))
          .mockResolvedValueOnce({ ok: true, status: 200, body: bodyStream } as Response)
      );
      const { generateWithRAG } = await import("./vertex-rag");
      await generateWithRAG([{ role: "user", content: "greetings" }], "base system prompt");

      const secondCallBody = JSON.parse(vi.mocked(fetch).mock.calls[1][1]?.body as string);
      expect(secondCallBody.systemInstruction.parts[0].text).toContain("GROUNDING CONTEXT");
      expect(secondCallBody.systemInstruction.parts[0].text).toContain("RAG chunk content");
    });
  });
});
