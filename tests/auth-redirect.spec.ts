import { test, expect } from "@playwright/test";

/**
 * Authentication & Route Protection E2E Tests
 *
 * Tests that protected routes redirect unauthenticated users to sign-in,
 * and that public routes remain accessible.
 */

test.describe("Authentication — Route Protection", () => {
  test("should redirect /learn to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/learn");
    // Clerk middleware should redirect to sign-in
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

  test("should redirect /chat to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/chat");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });

  test("should redirect /courses to sign-in for unauthenticated users", async ({ page }) => {
    await page.goto("/courses");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});

test.describe("Authentication — Public Routes", () => {
  test("landing page (/) should be accessible without auth", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    // Should NOT redirect to sign-in
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
});
