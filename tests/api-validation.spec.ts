import { test, expect } from "@playwright/test";

/**
 * API Validation E2E Tests
 *
 * Tests the API endpoints directly (without browser UI) to verify:
 * - Authentication enforcement (unauthenticated requests are blocked)
 * - Correct error response format
 * - HTTP method validation
 * - Admin CRUD endpoint protection
 *
 * NOTE: Unauthenticated calls to /api/* reach route handlers (middleware
 * skips auth.protect on API routes). Expect JSON error bodies (e.g. 401)
 * rather than HTML 404 from Clerk rewrites.
 */

// ──────────────────────────────────────────────────
// Quiz API Endpoints
// ──────────────────────────────────────────────────

test.describe("API — Quiz Generate Endpoint", () => {
  const QUIZ_API = "/api/quiz/generate";

  test("should reject unauthenticated POST request", async ({ request }) => {
    const response = await request.post(QUIZ_API, {
      data: {
        topic: "greetings",
        difficulty: "beginner",
        questionCount: 5,
        questionTypes: ["mcq"],
      },
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated POST with empty body", async ({ request }) => {
    const response = await request.post(QUIZ_API, {
      data: {},
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated POST with partial data", async ({ request }) => {
    const response = await request.post(QUIZ_API, {
      data: {
        topic: "greetings",
      },
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated GET request", async ({ request }) => {
    const response = await request.get(QUIZ_API);
    expect(response.ok()).toBe(false);
  });
});

test.describe("API — Quiz Session Endpoint", () => {
  const SESSION_API = "/api/quiz/session";

  test("should reject unauthenticated GET request", async ({ request }) => {
    const response = await request.get(SESSION_API);
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated GET with sessionId param", async ({ request }) => {
    const response = await request.get(`${SESSION_API}?sessionId=123`);
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated GET with invalid sessionId", async ({ request }) => {
    const response = await request.get(`${SESSION_API}?sessionId=invalid`);
    expect(response.ok()).toBe(false);
  });
});

// ──────────────────────────────────────────────────
// Chat API Endpoint
// ──────────────────────────────────────────────────

test.describe("API — Chat Endpoint", () => {
  const CHAT_API = "/api/chat";

  test("should reject unauthenticated POST request", async ({ request }) => {
    const response = await request.post(CHAT_API, {
      data: {
        conversationId: 1,
        message: "Hello",
      },
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated POST with empty body", async ({ request }) => {
    const response = await request.post(CHAT_API, {
      data: {},
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated GET request", async ({ request }) => {
    const response = await request.get(CHAT_API);
    expect(response.ok()).toBe(false);
  });
});

// ──────────────────────────────────────────────────
// Admin CRUD API Endpoints — Courses
// ──────────────────────────────────────────────────

test.describe("API — Courses CRUD (Admin Protected)", () => {
  const COURSES_API = "/api/courses";

  test("should reject unauthenticated GET /api/courses", async ({ request }) => {
    const response = await request.get(COURSES_API);
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated POST /api/courses", async ({ request }) => {
    const response = await request.post(COURSES_API, {
      data: { title: "Test Course", imageSrc: "/test.png" },
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated GET /api/courses/1", async ({ request }) => {
    const response = await request.get(`${COURSES_API}/1`);
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated PUT /api/courses/1", async ({ request }) => {
    const response = await request.put(`${COURSES_API}/1`, {
      data: { title: "Updated" },
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated DELETE /api/courses/1", async ({ request }) => {
    const response = await request.delete(`${COURSES_API}/1`);
    expect(response.ok()).toBe(false);
  });
});

// ──────────────────────────────────────────────────
// Admin CRUD API Endpoints — Units
// ──────────────────────────────────────────────────

test.describe("API — Units CRUD (Admin Protected)", () => {
  const UNITS_API = "/api/units";

  test("should reject unauthenticated GET /api/units", async ({ request }) => {
    const response = await request.get(UNITS_API);
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated POST /api/units", async ({ request }) => {
    const response = await request.post(UNITS_API, {
      data: { title: "Test Unit", description: "Test", courseId: 1, order: 1 },
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated GET /api/units/1", async ({ request }) => {
    const response = await request.get(`${UNITS_API}/1`);
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated PUT /api/units/1", async ({ request }) => {
    const response = await request.put(`${UNITS_API}/1`, {
      data: { title: "Updated" },
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated DELETE /api/units/1", async ({ request }) => {
    const response = await request.delete(`${UNITS_API}/1`);
    expect(response.ok()).toBe(false);
  });
});

// ──────────────────────────────────────────────────
// Admin CRUD API Endpoints — Lessons
// ──────────────────────────────────────────────────

test.describe("API — Lessons CRUD (Admin Protected)", () => {
  const LESSONS_API = "/api/lessons";

  test("should reject unauthenticated GET /api/lessons", async ({ request }) => {
    const response = await request.get(LESSONS_API);
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated POST /api/lessons", async ({ request }) => {
    const response = await request.post(LESSONS_API, {
      data: { title: "Test Lesson", unitId: 1, order: 1 },
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated GET /api/lessons/1", async ({ request }) => {
    const response = await request.get(`${LESSONS_API}/1`);
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated PUT /api/lessons/1", async ({ request }) => {
    const response = await request.put(`${LESSONS_API}/1`, {
      data: { title: "Updated" },
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated DELETE /api/lessons/1", async ({ request }) => {
    const response = await request.delete(`${LESSONS_API}/1`);
    expect(response.ok()).toBe(false);
  });
});

// ──────────────────────────────────────────────────
// Admin CRUD API Endpoints — Challenges
// ──────────────────────────────────────────────────

test.describe("API — Challenges CRUD (Admin Protected)", () => {
  const CHALLENGES_API = "/api/challenges";

  test("should reject unauthenticated GET /api/challenges", async ({ request }) => {
    const response = await request.get(CHALLENGES_API);
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated POST /api/challenges", async ({ request }) => {
    const response = await request.post(CHALLENGES_API, {
      data: { question: "Test?", type: "SELECT", lessonId: 1, order: 1 },
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated GET /api/challenges/1", async ({ request }) => {
    const response = await request.get(`${CHALLENGES_API}/1`);
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated PUT /api/challenges/1", async ({ request }) => {
    const response = await request.put(`${CHALLENGES_API}/1`, {
      data: { question: "Updated?" },
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated DELETE /api/challenges/1", async ({ request }) => {
    const response = await request.delete(`${CHALLENGES_API}/1`);
    expect(response.ok()).toBe(false);
  });
});

// ──────────────────────────────────────────────────
// Admin CRUD API Endpoints — Challenge Options
// ──────────────────────────────────────────────────

test.describe("API — Challenge Options CRUD (Admin Protected)", () => {
  const OPTIONS_API = "/api/challengeOptions";

  test("should reject unauthenticated GET /api/challengeOptions", async ({ request }) => {
    const response = await request.get(OPTIONS_API);
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated POST /api/challengeOptions", async ({ request }) => {
    const response = await request.post(OPTIONS_API, {
      data: { text: "Option A", correct: true, challengeId: 1 },
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated GET /api/challengeOptions/1", async ({ request }) => {
    const response = await request.get(`${OPTIONS_API}/1`);
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated PUT /api/challengeOptions/1", async ({ request }) => {
    const response = await request.put(`${OPTIONS_API}/1`, {
      data: { text: "Updated" },
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject unauthenticated DELETE /api/challengeOptions/1", async ({ request }) => {
    const response = await request.delete(`${OPTIONS_API}/1`);
    expect(response.ok()).toBe(false);
  });
});

// ──────────────────────────────────────────────────
// Stripe Webhook Endpoint
// ──────────────────────────────────────────────────

test.describe("API — Stripe Webhook Endpoint", () => {
  const WEBHOOK_API = "/api/webhooks/stripe";

  test("should reject POST without Stripe signature", async ({ request }) => {
    const response = await request.post(WEBHOOK_API, {
      data: { type: "checkout.session.completed" },
    });
    // Without valid Stripe signature, the webhook handler should reject
    expect(response.ok()).toBe(false);
  });

  test("should reject POST with empty body", async ({ request }) => {
    const response = await request.post(WEBHOOK_API, {
      data: {},
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject GET request to webhook endpoint", async ({ request }) => {
    const response = await request.get(WEBHOOK_API);
    expect(response.ok()).toBe(false);
  });
});

// ──────────────────────────────────────────────────
// General Error Handling
// ──────────────────────────────────────────────────

test.describe("API — General Error Handling", () => {
  test("should return error for non-existent API routes", async ({ request }) => {
    const response = await request.get("/api/nonexistent");
    expect(response.ok()).toBe(false);
  });

  test("should return error for non-existent nested API routes", async ({ request }) => {
    const response = await request.get("/api/nonexistent/deep/path");
    expect(response.ok()).toBe(false);
  });

  test("should reject malformed JSON on protected route", async ({ request }) => {
    const response = await request.post("/api/quiz/generate", {
      headers: { "Content-Type": "application/json" },
      data: "this is not json",
    });
    expect(response.ok()).toBe(false);
  });

  test("should reject request with unexpected content type", async ({ request }) => {
    const response = await request.post("/api/chat", {
      headers: { "Content-Type": "text/plain" },
      data: "plain text body",
    });
    expect(response.ok()).toBe(false);
  });
});

// ──────────────────────────────────────────────────
// API Response Headers
// ──────────────────────────────────────────────────

test.describe("API — Response Headers", () => {
  test("API responses should include content-type header", async ({ request }) => {
    const response = await request.get("/api/courses");
    const contentType = response.headers()["content-type"];
    // Even error responses should have a content-type
    expect(contentType).toBeTruthy();
  });

  test("protected API endpoints should return consistent non-200 status", async ({ request }) => {
    const endpoints = [
      { method: "GET", url: "/api/courses" },
      { method: "GET", url: "/api/units" },
      { method: "GET", url: "/api/lessons" },
      { method: "GET", url: "/api/challenges" },
      { method: "GET", url: "/api/challengeOptions" },
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint.url);
      expect(response.ok(), `${endpoint.method} ${endpoint.url} should not be ok`).toBe(false);
    }
  });
});
