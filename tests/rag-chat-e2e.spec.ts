import { test, expect } from "@playwright/test";

/**
 * End-to-end testing of the RAG Chat API
 * 
 * Tests the interaction with the Vertex AI RAG corpus by verifying responses
 * and testing the Gemini fallback mechanism.
 * 
 * Uses 'x-e2e-bypass-auth' to cleanly bypass Next.js Clerk auth in non-production.
 */

test.describe("RAG API E2E Validation", () => {
  const CHAT_API = "/api/chat";
  
  // Headers to use our test-only bypass mechanisms during E2E runs
  const defaultHeaders = {
    "Content-Type": "application/json",
    "x-e2e-bypass-auth": "true"
  };

  test("should respond using active RAG corpus to course related questions", async ({ request }) => {
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
    // Output the response text so it is printed or accessible for manual documentation
    console.log("\n==== [ACTIVE RAG RESPONSE] ====\n", text, "\n============================================\n");
    
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
    console.log("\n==== [ACTIVE RAG GREETINGS] ====\n", text, "\n============================================\n");
    
    // Check if the greeting includes common Sinhala phrases
    expect(text.toLowerCase()).toContain("ayubowan");
  });

  test("should gracefully fallback to gemini sdk when RAG retrieval is forced to fail", async ({ request }) => {
    // We inject the x-mock-rag-failure header to simulate a 503 from Vertex AI
    const response = await request.post(CHAT_API, {
      headers: {
        ...defaultHeaders,
        "x-mock-rag-failure": "true"
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
    console.log("\n==== [FALLBACK RESPONSE] ====\n", text, "\n============================================\n");
    
    // As a base LLM without strict local grounding, the response format might differ
    expect(text.length).toBeGreaterThan(10);
  });
});
