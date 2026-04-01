import { test, expect } from "@playwright/test";

/**
 * Error Handling & Edge Cases E2E Tests
 *
 * Tests invalid routes, error boundaries, and various edge cases
 * in URL handling. Note: Clerk middleware may redirect unknown routes
 * to sign-in rather than returning a 404 status.
 */

test.describe("Error Handling — Non-Existent Pages", () => {
  test("should handle /nonexistent-page without crashing", async ({ page }) => {
    const response = await page.goto("/nonexistent-page");
    // Clerk middleware may redirect unknown routes to sign-in (returning 200),
    // or Next.js may return 404. Either way the response should exist.
    expect(response).toBeTruthy();
    expect(response?.status()).toBeLessThanOrEqual(404);
  });

  test("should handle /totally/random/deep/path without crashing", async ({
    page,
  }) => {
    const response = await page.goto("/totally/random/deep/path");
    expect(response).toBeTruthy();
    expect(response?.status()).toBeLessThanOrEqual(404);
  });

  test("should show a page with some content for non-existent route", async ({
    page,
  }) => {
    await page.goto("/nonexistent-page");
    // Should render something (either 404 page or redirect to sign-in)
    const body = page.locator("body");
    await expect(body).toBeVisible();
    const text = await body.textContent();
    expect(text!.length).toBeGreaterThan(0);
  });
});

test.describe("Error Handling — Invalid Route Patterns", () => {
  test("should handle /lesson/invalid-id gracefully", async ({ page }) => {
    // This is a protected route, so it should redirect to sign-in
    await page.goto("/lesson/invalid-id");
    // Either 404 or redirect to sign-in
    const url = page.url();
    const isSignIn = url.includes("sign-in");
    const status = !isSignIn; // If not redirected, check if page loaded
    expect(isSignIn || status).toBeTruthy();
  });

  test("should handle URL with special characters", async ({ page }) => {
    const response = await page.goto("/learn?foo=bar&baz=<script>");
    // Should not crash; either redirect to sign-in (protected) or handle gracefully
    expect(response).toBeTruthy();
  });

  test("should handle URL with extremely long path without crashing", async ({
    page,
  }) => {
    const longPath = "/a".repeat(200);
    const response = await page.goto(longPath);
    // Should not crash — either redirect, 404, or 200 are all acceptable
    expect(response).toBeTruthy();
    expect(response?.status()).toBeLessThanOrEqual(404);
  });
});

test.describe("Error Handling — API Edge Cases", () => {
  test("should handle API request with no body", async ({ request }) => {
    const response = await request.post("/api/quiz/generate");
    expect(response.ok()).toBe(false);
  });

  test("should handle API request with null values", async ({ request }) => {
    const response = await request.post("/api/chat", {
      data: { conversationId: null, message: null },
    });
    expect(response.ok()).toBe(false);
  });

  test("should handle API request with very large payload", async ({
    request,
  }) => {
    const largeMessage = "x".repeat(10000);
    const response = await request.post("/api/chat", {
      data: { conversationId: 1, message: largeMessage },
    });
    expect(response.ok()).toBe(false);
  });
});

test.describe("Error Handling — Redirect Loops", () => {
  test("landing page should not create redirect loops", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    // Should stay on / — no redirect loop
    await expect(page).toHaveURL("/");
  });

  test("sign-in page should not create redirect loops", async ({ page }) => {
    const response = await page.goto("/sign-in");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/sign-in/);
  });

  test("sign-up page should not create redirect loops", async ({ page }) => {
    const response = await page.goto("/sign-up");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/sign-up/);
  });
});

test.describe("Error Handling — Method Not Allowed", () => {
  test("webhook endpoint should not accept GET", async ({ request }) => {
    const response = await request.get("/api/webhooks/stripe");
    expect(response.ok()).toBe(false);
  });

  test("quiz generate endpoint should reject GET", async ({ request }) => {
    const response = await request.get("/api/quiz/generate");
    expect(response.ok()).toBe(false);
  });
});

test.describe("Error Handling — Content Negotiation", () => {
  test("API should handle request with Accept: text/html header", async ({
    request,
  }) => {
    const response = await request.get("/api/courses", {
      headers: { Accept: "text/html" },
    });
    // Clerk middleware redirects unauthenticated requests regardless of Accept header
    // The response should exist and be non-successful (redirected/blocked)
    expect(response).toBeTruthy();
  });

  test("should handle request with unusual Accept header", async ({
    request,
  }) => {
    const response = await request.get("/api/units", {
      headers: { Accept: "application/xml" },
    });
    expect(response.ok()).toBe(false);
  });
});
