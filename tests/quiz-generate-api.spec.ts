import { test, expect } from "@playwright/test";

/**
 * HTTP contract for POST /api/quiz/generate after middleware skips auth.protect() on /api/*.
 * Ensures clients always get JSON (never an HTML 404) so fetch + JSON.parse is safe.
 */
test.describe("POST /api/quiz/generate (HTTP contract)", () => {
  test("unauthenticated request returns 401 application/json with error string", async ({
    request,
  }) => {
    const response = await request.post("/api/quiz/generate", {
      data: {
        topic: "Greetings",
        difficulty: "beginner",
        questionCount: 5,
        questionTypes: ["mcq"],
      },
    });

    expect(response.status()).toBe(401);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toMatch(/application\/json/i);

    const raw = await response.text();
    expect(raw.trim().startsWith("<")).toBe(false);

    const body = JSON.parse(raw) as { error?: unknown };
    expect(typeof body.error).toBe("string");
    expect((body.error as string).length).toBeGreaterThan(0);
  });

  test("GET returns 405 Method Not Allowed (POST-only route)", async ({ request }) => {
    const response = await request.get("/api/quiz/generate");
    expect(response.status()).toBe(405);
  });
});
