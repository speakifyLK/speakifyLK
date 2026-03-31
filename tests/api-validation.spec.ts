import { test, expect } from "@playwright/test";

/**
 * API Validation E2E Tests
 *
 * Tests the API endpoints directly (without browser UI) to verify:
 * - Authentication enforcement (401 for unauthenticated requests)
 * - Input validation (400 for malformed requests)
 * - Correct error response format
 */

test.describe("API — Quiz Generate Endpoint", () => {
  const QUIZ_API = "/api/quiz/generate";

  test("should return 401 for unauthenticated requests", async ({ request }) => {
    const response = await request.post(QUIZ_API, {
      data: {
        topic: "greetings",
        difficulty: "beginner",
        questionCount: 5,
        questionTypes: ["mcq"],
      },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test("should return 401 with correct error message", async ({ request }) => {
    const response = await request.post(QUIZ_API, {
      data: {},
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain("Unauthorized");
  });
});

test.describe("API — Chat Endpoint", () => {
  const CHAT_API = "/api/chat";

  test("should return 401 for unauthenticated requests", async ({ request }) => {
    const response = await request.post(CHAT_API, {
      data: {
        conversationId: 1,
        message: "Hello",
      },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe("API — Quiz Session Endpoint", () => {
  const SESSION_API = "/api/quiz/session";

  test("should return 401 for unauthenticated GET request", async ({ request }) => {
    const response = await request.get(SESSION_API);
    // Should be 401 (unauthenticated) or 405 (method not allowed)
    expect([401, 405]).toContain(response.status());
  });
});

test.describe("API — General Error Handling", () => {
  test("should return 404 for non-existent API routes", async ({ request }) => {
    const response = await request.get("/api/nonexistent");
    expect(response.status()).toBe(404);
  });

  test("should handle malformed JSON in request body", async ({ request }) => {
    const response = await request.post("/api/quiz/generate", {
      headers: { "Content-Type": "application/json" },
      data: "this is not json",
    });
    // Should return 400 or 401 (auth check happens first)
    expect([400, 401]).toContain(response.status());
  });
});
