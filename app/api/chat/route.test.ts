import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
const mockSendMessage = vi.hoisted(() => vi.fn());
const mockSaveAssistantMessage = vi.hoisted(() => vi.fn());
const mockGetMessages = vi.hoisted(() => vi.fn());
const mockGetUserProgress = vi.hoisted(() => vi.fn());
const mockGetUnits = vi.hoisted(() => vi.fn());
const mockGetUserSubscription = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockGenerateWithRAG = vi.hoisted(() => vi.fn());
const mockGetGeminiClient = vi.hoisted(() => vi.fn());
const mockGetModel = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
vi.mock("@/lib/chat-prompt", () => ({ SINHALA_TUTOR_PROMPT: "MOCK_PROMPT" }));
vi.mock("@/actions/chat", () => ({
  sendMessage: mockSendMessage,
  saveAssistantMessage: mockSaveAssistantMessage,
  getMessages: mockGetMessages,
}));
vi.mock("@/lib/gemini", () => ({
  getGeminiClient: mockGetGeminiClient,
  getModel: mockGetModel,
  safetySettings: [],
  generationConfig: {},
}));
vi.mock("@/db/queries", () => ({
  getUserProgress: mockGetUserProgress,
  getUnits: mockGetUnits,
  getUserSubscription: mockGetUserSubscription,
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));
vi.mock("@/lib/vertex-rag", () => ({
  generateWithRAG: mockGenerateWithRAG,
}));

import { POST } from "./route";

// Helper to create a POST request with JSON body
function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Helper to read a ReadableStream to string
async function readStream(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.E2E_BYPASS_AUTH_SECRET = "test-secret";
    mockGetModel.mockReturnValue("gemini-pro");
    // Default: authenticated user
    mockAuth.mockResolvedValue({ userId: "user1" });
    // Default: no subscription
    mockGetUserSubscription.mockResolvedValue(null);
    // Default: no rate limit
    mockCheckRateLimit.mockReturnValue(null);
    // Default: no active course
    mockGetUserProgress.mockResolvedValue(null);
    // Default: message saved ok
    mockSendMessage.mockResolvedValue(undefined);
    // Default: empty history
    mockGetMessages.mockResolvedValue([]);
    // Default: save response ok
    mockSaveAssistantMessage.mockResolvedValue(undefined);
  });

  // ── Auth ──
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(makeRequest({ conversationId: 1, message: "hi" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("allows access when x-e2e-test-bypass header matches secret and not production", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockResolvedValue(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("ok"));
          c.close();
        },
      })
    );

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-e2e-test-bypass": "test-secret" },
      body: JSON.stringify({ conversationId: 1, message: "hi" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("does not allow access via x-e2e-test-bypass when in production env", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const origEnv = process.env.NODE_ENV;
    // @ts-expect-error -- overriding for test
    process.env.NODE_ENV = "production";

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-e2e-test-bypass": "test-secret" },
      body: JSON.stringify({ conversationId: 1, message: "hi" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    // @ts-expect-error -- overriding for test
    process.env.NODE_ENV = origEnv;
  });

  // ── Body validation ──
  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request body" });
  });

  it("returns 400 when conversationId is not a finite integer", async () => {
    const res = await POST(makeRequest({ conversationId: "abc", message: "hi" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid conversationId");
  });

  it("returns 400 when conversationId is NaN", async () => {
    const res = await POST(makeRequest({ conversationId: NaN, message: "hi" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid conversationId");
  });

  it("returns 400 when conversationId is Infinity", async () => {
    const res = await POST(makeRequest({ conversationId: Infinity, message: "hi" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid conversationId");
  });

  it("returns 400 when conversationId is a float", async () => {
    const res = await POST(makeRequest({ conversationId: 1.5, message: "hi" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid conversationId");
  });

  it("accepts conversationId as a string-encoded integer", async () => {
    // conversationId: "5" should be parsed to 5
    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockResolvedValue(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("ok"));
          c.close();
        },
      })
    );
    const res = await POST(makeRequest({ conversationId: "5", message: "hi" }));
    expect(res.status).toBe(200);
  });

  it("returns 400 when message is missing", async () => {
    const res = await POST(makeRequest({ conversationId: 1 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Missing or invalid message");
  });

  it("returns 400 when message is empty string", async () => {
    const res = await POST(makeRequest({ conversationId: 1, message: "   " }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Missing or invalid message");
  });

  it("returns 400 when message is not a string", async () => {
    const res = await POST(makeRequest({ conversationId: 1, message: 123 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Missing or invalid message");
  });

  // ── Rate limiting ──
  it("returns 429 when rate limited (non-subscriber)", async () => {
    mockCheckRateLimit.mockReturnValue({ retryAfterSeconds: 60 });
    const res = await POST(makeRequest({ conversationId: 1, message: "hi" }));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain("Rate limit exceeded");
    expect(data.retryAfterSeconds).toBe(60);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("skips rate limiting for subscribers", async () => {
    mockGetUserSubscription.mockResolvedValue({ isActive: true });
    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockResolvedValue(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("hello"));
          c.close();
        },
      })
    );
    const res = await POST(makeRequest({ conversationId: 1, message: "hi" }));
    expect(res.status).toBe(200);
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it("treats subscription check failure as non-subscriber", async () => {
    mockGetUserSubscription.mockRejectedValue(new Error("DB error"));
    mockCheckRateLimit.mockReturnValue(null); // not rate limited
    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockResolvedValue(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("ok"));
          c.close();
        },
      })
    );
    const res = await POST(makeRequest({ conversationId: 1, message: "hi" }));
    expect(res.status).toBe(200);
    // Rate limit WAS checked because subscription check failed
    expect(mockCheckRateLimit).toHaveBeenCalledWith("user1");
  });

  // ── Course context ──
  it("builds course context with current unit and completed lessons", async () => {
    mockGetUserProgress.mockResolvedValue({
      activeCourse: { title: "Sinhala Basics" },
    });
    mockGetUnits.mockResolvedValue([
      {
        title: "Unit 1",
        lessons: [
          { title: "Greetings", completed: true },
          { title: "Numbers", completed: true },
          { title: "Colors", completed: false },
        ],
      },
      {
        title: "Unit 2",
        lessons: [{ title: "Animals", completed: false }],
      },
    ]);
    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockResolvedValue(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("response"));
          c.close();
        },
      })
    );

    const res = await POST(makeRequest({ conversationId: 1, message: "hello" }));
    expect(res.status).toBe(200);
  });

  it("builds course context without current unit (all completed)", async () => {
    mockGetUserProgress.mockResolvedValue({
      activeCourse: { title: "Sinhala Basics" },
    });
    mockGetUnits.mockResolvedValue([
      {
        title: "Unit 1",
        lessons: [{ title: "Greetings", completed: true }],
      },
    ]);
    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockResolvedValue(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("ok"));
          c.close();
        },
      })
    );

    const res = await POST(makeRequest({ conversationId: 1, message: "hello" }));
    expect(res.status).toBe(200);
  });

  it("builds course context with no completed lessons", async () => {
    mockGetUserProgress.mockResolvedValue({
      activeCourse: { title: "Sinhala Basics" },
    });
    mockGetUnits.mockResolvedValue([
      {
        title: "Unit 1",
        lessons: [{ title: "Greetings", completed: false }],
      },
    ]);
    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockResolvedValue(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("ok"));
          c.close();
        },
      })
    );

    const res = await POST(makeRequest({ conversationId: 1, message: "hello" }));
    expect(res.status).toBe(200);
  });

  it("continues without course context when getUserProgress fails", async () => {
    mockGetUserProgress.mockRejectedValue(new Error("DB error"));
    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockResolvedValue(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("ok"));
          c.close();
        },
      })
    );

    const res = await POST(makeRequest({ conversationId: 1, message: "hello" }));
    expect(res.status).toBe(200);
  });

  // ── Save user message failures ──
  it("returns 500 when sendMessage fails", async () => {
    mockSendMessage.mockRejectedValue(new Error("DB error"));
    const res = await POST(makeRequest({ conversationId: 1, message: "hi" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Failed to save message");
  });

  // ── Load history failures ──
  it("returns 500 when getMessages fails", async () => {
    mockGetMessages.mockRejectedValue(new Error("DB error"));
    const res = await POST(makeRequest({ conversationId: 1, message: "hi" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Failed to load conversation");
  });

  // ── RAG flow ──
  it("streams RAG response with correct headers", async () => {
    mockGetMessages.mockResolvedValue([
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi there" },
    ]);
    mockGenerateWithRAG.mockResolvedValue(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("chunk1"));
          c.enqueue(new TextEncoder().encode("chunk2"));
          c.close();
        },
      })
    );

    const res = await POST(makeRequest({ conversationId: 1, message: "hello" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RAG-Status")).toBe("active");
    expect(res.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");

    const text = await readStream(res);
    expect(text).toBe("chunk1chunk2");
    expect(mockSaveAssistantMessage).toHaveBeenCalledWith(1, "chunk1chunk2");
  });

  it("RAG stream skips empty text chunks", async () => {
    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockResolvedValue(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("")); // empty
          c.enqueue(new TextEncoder().encode("data"));
          c.close();
        },
      })
    );

    const res = await POST(makeRequest({ conversationId: 1, message: "hi" }));
    const text = await readStream(res);
    expect(text).toBe("data");
    expect(mockSaveAssistantMessage).toHaveBeenCalledWith(1, "data");
  });

  it("does not save assistant message when response is empty/whitespace", async () => {
    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockResolvedValue(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("   "));
          c.close();
        },
      })
    );

    const res = await POST(makeRequest({ conversationId: 1, message: "hi" }));
    await readStream(res);
    expect(mockSaveAssistantMessage).not.toHaveBeenCalled();
  });

  it("uses local RAG mock stream when x-e2e-test-bypass header matches secret", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    mockGetMessages.mockResolvedValue([]);

    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-e2e-test-bypass": "test-secret" },
      body: JSON.stringify({ conversationId: 1, message: "hi" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await readStream(res);
    expect(text).toContain("mock RAG response");
    expect(mockGenerateWithRAG).not.toHaveBeenCalled();
  });

  // ── RAG failure → Gemini fallback ──
  it("falls back to Gemini when x-mock-rag-failure header is present using E2E shortcut", async () => {
    mockGetMessages.mockResolvedValue([]);
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-mock-rag-failure": "true", "x-e2e-test-bypass": "test-secret" },
      body: JSON.stringify({ conversationId: 1, message: "hi" }),
    });

    const mockResponse = {
      [Symbol.asyncIterator]: async function* () {
        yield { text: "fallback data" };
      },
    };
    mockGetGeminiClient.mockReturnValue({
      models: {
        generateContentStream: vi.fn().mockResolvedValue(mockResponse),
      },
    });

    // We don't change NODE_ENV here because Vitest typically runs with NODE_ENV="test" which satisfies !== "production".
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RAG-Status")).toBe("fallback");

    const text = await readStream(res);
    expect(text).toBe("fallback data");
    expect(mockGenerateWithRAG).not.toHaveBeenCalled();
  });

  it("does not force fallback if x-mock-rag-failure is set in production env", async () => {
    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockResolvedValue(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("rag ok"));
          c.close();
        },
      })
    );
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-mock-rag-failure": "true", "x-e2e-test-bypass": "test-secret" },
      body: JSON.stringify({ conversationId: 1, message: "hi" }),
    });

    const origEnv = process.env.NODE_ENV;
    // @ts-expect-error -- overriding for test
    process.env.NODE_ENV = "production";

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RAG-Status")).toBe("active");

    // @ts-expect-error -- overriding for test
    process.env.NODE_ENV = origEnv;
  });

  it("falls back to Gemini when RAG fails", async () => {
    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockRejectedValue(new Error("RAG failed (503)"));

    const mockResponse = {
      [Symbol.asyncIterator]: async function* () {
        yield { text: "fallback " };
        yield { text: "response" };
      },
    };
    mockGetGeminiClient.mockReturnValue({
      models: {
        generateContentStream: vi.fn().mockResolvedValue(mockResponse),
      },
    });

    const res = await POST(makeRequest({ conversationId: 1, message: "hi" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RAG-Status")).toBe("fallback");

    const text = await readStream(res);
    expect(text).toBe("fallback response");
    expect(mockSaveAssistantMessage).toHaveBeenCalledWith(1, "fallback response");
  });

  it("falls back to Gemini when RAG fails with non-Error", async () => {
    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockRejectedValue("string error");

    const mockResponse = {
      [Symbol.asyncIterator]: async function* () {
        yield { text: "ok" };
      },
    };
    mockGetGeminiClient.mockReturnValue({
      models: {
        generateContentStream: vi.fn().mockResolvedValue(mockResponse),
      },
    });

    const res = await POST(makeRequest({ conversationId: 1, message: "hi" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RAG-Status")).toBe("fallback");
  });

  it("Gemini fallback handles null text chunks", async () => {
    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockRejectedValue(new Error("RAG down"));

    const mockResponse = {
      [Symbol.asyncIterator]: async function* () {
        yield { text: null };
        yield { text: "data" };
        yield { text: undefined };
      },
    };
    mockGetGeminiClient.mockReturnValue({
      models: {
        generateContentStream: vi.fn().mockResolvedValue(mockResponse),
      },
    });

    const res = await POST(makeRequest({ conversationId: 1, message: "hi" }));
    const text = await readStream(res);
    expect(text).toBe("data");
  });

  it("uses local Gemini mock stream when x-e2e-test-bypass header matches secret", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    mockGetMessages.mockResolvedValue([]);
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-e2e-test-bypass": "test-secret", "x-mock-rag-failure": "true" },
      body: JSON.stringify({ conversationId: 1, message: "hi" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await readStream(res);
    expect(text).toContain("mock Gemini fallback response");
  });

  // ── Both RAG and Gemini fail ──
  it("returns 503 when both RAG and Gemini fail", async () => {
    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockRejectedValue(new Error("RAG down"));
    mockGetGeminiClient.mockReturnValue({
      models: {
        generateContentStream: vi.fn().mockRejectedValue(new Error("Gemini down")),
      },
    });

    const res = await POST(makeRequest({ conversationId: 1, message: "hi" }));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain("AI service temporarily unavailable");
  });

  // ── Stream error handling ──
  it("handles stream error during RAG reading", async () => {
    mockGetMessages.mockResolvedValue([]);

    // Create a stream that errors mid-read
    const errorStream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode("partial"));
        c.error(new Error("Stream broke"));
      },
    });
    mockGenerateWithRAG.mockResolvedValue(errorStream);

    const res = await POST(makeRequest({ conversationId: 1, message: "hi" }));
    expect(res.status).toBe(200); // The response was created before error

    // Reading the stream should throw
    const reader = res.body!.getReader();
    let errored = false;
    try {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch {
      errored = true;
    }
    expect(errored).toBe(true);
  });

  // ── NODE_ENV logging branch ──
  it("logs course context in non-production env", async () => {
    const origEnv = process.env.NODE_ENV;
    // @ts-expect-error -- NODE_ENV is read-only in types but assignable at runtime
    process.env.NODE_ENV = "test";

    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockResolvedValue(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("ok"));
          c.close();
        },
      })
    );

    const res = await POST(makeRequest({ conversationId: 1, message: "hi" }));
    expect(res.status).toBe(200);

    // @ts-expect-error -- NODE_ENV is read-only in types but assignable at runtime
    process.env.NODE_ENV = origEnv;
  });

  it("skips course context logging in production env", async () => {
    const origEnv = process.env.NODE_ENV;
    // @ts-expect-error -- NODE_ENV is read-only in types but assignable at runtime
    process.env.NODE_ENV = "production";

    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockResolvedValue(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("ok"));
          c.close();
        },
      })
    );

    const res = await POST(makeRequest({ conversationId: 1, message: "hi" }));
    expect(res.status).toBe(200);

    // @ts-expect-error -- NODE_ENV is read-only in types but assignable at runtime
    process.env.NODE_ENV = origEnv;
  });

  // ── History formatting ──
  it("correctly formats history for RAG and passes to generateWithRAG", async () => {
    const history = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ];
    mockGetMessages.mockResolvedValue(history);
    mockGenerateWithRAG.mockResolvedValue(
      new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("ok"));
          c.close();
        },
      })
    );

    await POST(makeRequest({ conversationId: 1, message: "test" }));

    expect(mockGenerateWithRAG).toHaveBeenCalledWith(
      [
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi" },
      ],
      expect.stringContaining("MOCK_PROMPT")
    );
  });

  // ── RAG error with status code in parentheses ──
  it("extracts status code from RAG error message for logging", async () => {
    mockGetMessages.mockResolvedValue([]);
    mockGenerateWithRAG.mockRejectedValue(new Error("Service unavailable (503)"));

    const mockResponse = {
      [Symbol.asyncIterator]: async function* () {
        yield { text: "ok" };
      },
    };
    mockGetGeminiClient.mockReturnValue({
      models: {
        generateContentStream: vi.fn().mockResolvedValue(mockResponse),
      },
    });

    const res = await POST(makeRequest({ conversationId: 1, message: "hi" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RAG-Status")).toBe("fallback");
  });
});
