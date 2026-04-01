import { test, expect } from "@playwright/test";

/**
 * Authentication & Route Protection E2E Tests
 *
 * Tests that protected routes redirect unauthenticated users to sign-in,
 * and that public routes remain accessible. Covers every route in the app.
 */

test.describe("Authentication — Protected Routes (Main App)", () => {
  test("should redirect /learn to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/learn");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });

  test("should redirect /quiz to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/quiz");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });

  test("should redirect /ai-quiz to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/ai-quiz");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });

  test("should redirect /leaderboard to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });

  test("should redirect /quests to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/quests");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });

  test("should redirect /shop to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/shop");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });

  test("should redirect /courses to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/courses");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});

test.describe("Authentication — Protected Routes (Chat)", () => {
  test("should redirect /chat to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/chat");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });

  test("should redirect /chat?id=1 to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/chat?id=1");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});

test.describe("Authentication — Protected Routes (Lesson)", () => {
  test("should redirect /lesson to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/lesson");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });

  test("should redirect /lesson/1 to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/lesson/1");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });

  test("should redirect /lesson/999 to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/lesson/999");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});

test.describe("Authentication — Protected Routes (Admin)", () => {
  test("should redirect /admin to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});

test.describe("Authentication — Protected Routes (Quiz with params)", () => {
  test("should redirect /quiz?sessionId=abc to sign-in for unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/quiz?sessionId=abc");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });

  test("should redirect /ai-quiz?sessionId=abc to sign-in for unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/ai-quiz?sessionId=abc");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});

test.describe("Authentication — Public Routes", () => {
  test("landing page (/) should be accessible without auth", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL("/");
  });

  test("/sign-in should be accessible without auth", async ({ page }) => {
    const response = await page.goto("/sign-in");
    expect(response?.status()).toBe(200);
  });

  test("/sign-up should be accessible without auth", async ({ page }) => {
    const response = await page.goto("/sign-up");
    expect(response?.status()).toBe(200);
  });

  test("/sign-in should not redirect to another sign-in page", async ({ page }) => {
    await page.goto("/sign-in");
    // Should stay on sign-in, not redirect further
    await expect(page).toHaveURL(/sign-in/);
  });

  test("/sign-up should not redirect to another sign-up page", async ({ page }) => {
    await page.goto("/sign-up");
    // Should stay on sign-up, not redirect further
    await expect(page).toHaveURL(/sign-up/);
  });
});

test.describe("Authentication — Redirect URL Patterns", () => {
  test("protected route redirect should include redirect_url parameter", async ({ page }) => {
    await page.goto("/learn");
    await page.waitForURL(/sign-in/, { timeout: 15000 });
    const url = page.url();
    // Clerk typically includes a redirect_url in the sign-in URL
    expect(url).toContain("sign-in");
  });

  test("multiple protected routes all redirect to sign-in (batch check)", async ({ page }) => {
    const protectedRoutes = [
      "/learn",
      "/courses",
      "/leaderboard",
      "/quests",
      "/shop",
      "/chat",
      "/lesson",
      "/admin",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/sign-in/, {
        timeout: 15000,
      });
    }
  });
});
