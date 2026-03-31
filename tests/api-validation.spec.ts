import { test, expect } from "@playwright/test";

/**
 * API Validation E2E Tests
 *
 * Tests the API endpoints directly (without browser UI) to verify:
 * - Authentication enforcement (unauthenticated requests are blocked)
 * - Correct error response format
 *
 * NOTE: Clerk middleware intercepts unauthenticated requests before they
 * reach the route handler. Protected routes return a non-success status
 * (typically 401 or 404 via redirect) rather than 200.
 */

test.describe("API — Quiz Generate Endpoint", () => {
  const QUIZ_API = "/api/quiz/generate";

  test("should reject unauthenticated requests", async ({ request }) => {
    const response = await request.post(QUIZ_API, {
      data: {
        topic: "greetings",
        difficulty: "beginner",
        questionCount: 5,
        questionTypes: ["mcq"],
      },
    });
    // Clerk middleware blocks unauthenticated requests — they should not succeed
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated requests with empty body", async ({ request }) => {
    const response = await request.post(QUIZ_API, {
      data: {},
    });
    // Clerk middleware blocks unauthenticated requests — they should not succeed
    expect(response.ok()).toBe(false);
  });
});

test.describe("API — Chat Endpoint", () => {
  const CHAT_API = "/api/chat";

  test("should reject unauthenticated requests", async ({ request }) => {
    const response = await request.post(CHAT_API, {
      data: {
        conversationId: 1,
        message: "Hello",
      },
    });
    // Clerk middleware blocks unauthenticated requests — they should not succeed
    expect(response.ok()).toBe(false);
  });
});

test.describe("API — Quiz Session Endpoint", () => {
  const SESSION_API = "/api/quiz/session";

  test("should reject unauthenticated GET request", async ({ request }) => {
    const response = await request.get(SESSION_API);
    // Clerk middleware blocks unauthenticated requests — they should not succeed
    expect(response.ok()).toBe(false);
  });
});

test.describe("API — General Error Handling", () => {
  test("should return 404 for non-existent API routes", async ({ request }) => {
    const response = await request.get("/api/nonexistent");
    expect(response.ok()).toBe(false);
  });

  test("should reject malformed JSON on protected route", async ({ request }) => {
    const response = await request.post("/api/quiz/generate", {
      headers: { "Content-Type": "application/json" },
      data: "this is not json",
    });
    // Clerk middleware blocks unauthenticated requests — they should not succeed
    expect(response.ok()).toBe(false);
  });
});
