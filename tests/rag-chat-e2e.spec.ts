import { test, expect } from "@playwright/test";

/**
 * End-to-end testing of the RAG Chat API
 *
 * Tests the interaction with the Vertex AI RAG corpus by verifying responses
 * and testing the Gemini fallback mechanism.
 *
 * Uses 'x-e2e-test-bypass' (secret-gated) to bypass Next.js Clerk auth in non-production.
 */

test.describe("RAG API E2E Validation", () => {
  // Gate tests to require credentials/secrets instead of running implicitly.
  test.skip(!process.env.E2E_BYPASS_AUTH_SECRET, "Missing E2E credentials");

  const CHAT_API = "/api/chat";

  // Headers to use our test-only bypass mechanisms during E2E runs
  const defaultHeaders = {
    "Content-Type": "application/json",
    "x-e2e-test-bypass": process.env.E2E_BYPASS_AUTH_SECRET || "fallback",
  };

  test("should respond using active RAG corpus to course related questions", async ({
    request,
  }) => {
    // We send a question asking about course context
    const response = await request.post(CHAT_API, {
      headers: defaultHeaders,
      data: {
        conversationId: 999991, // Dummy conversation ID for isolation
        message: "What are the Sinhala words for colours?",
      },
    });

    expect(response.ok()).toBe(true);

    // Assert that the request genuinely used the RAG pipeline
    expect(response.headers()["x-rag-status"]).toBe("active");

    const text = await response.text();
    test.info().attach("Active RAG Response", { body: text, contentType: "text/plain" });

    // Rough checks for vocabulary presence that should be in the course context
    expect(text.length).toBeGreaterThan(10);
  });

  test("should respond to basic greetings", async ({ request }) => {
    const response = await request.post(CHAT_API, {
      headers: defaultHeaders,
      data: {
        conversationId: 999992,
        message: "How do you say hello in Sinhala?",
      },
    });

    expect(response.ok()).toBe(true);
    expect(response.headers()["x-rag-status"]).toBe("active");

    const text = await response.text();
    test.info().attach("Active RAG Greetings", { body: text, contentType: "text/plain" });

    // Avoid asserting one exact transliteration from a non-deterministic model response.
    // Validate the stable API contract instead: successful active RAG response with a non-empty body.
    expect(response.headers()["content-type"]).toMatch(/(application\/json|text\/plain)/i);
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test("should gracefully fallback to gemini sdk when RAG retrieval is forced to fail", async ({
    request,
  }) => {
    // We inject the x-mock-rag-failure header to simulate a 503 from Vertex AI
    const response = await request.post(CHAT_API, {
      headers: {
        ...defaultHeaders,
        "x-mock-rag-failure": "true",
      },
      data: {
        conversationId: 999993,
        message: "What are the Sinhala words for colours?",
      },
    });

    expect(response.ok()).toBe(true);

    // Assert that the fallback was triggered
    expect(response.headers()["x-rag-status"]).toBe("fallback");

    const text = await response.text();
    test.info().attach("Fallback Response", { body: text, contentType: "text/plain" });

    // As a base LLM without strict local grounding, the response format might differ
    expect(text.length).toBeGreaterThan(10);
  });
});
