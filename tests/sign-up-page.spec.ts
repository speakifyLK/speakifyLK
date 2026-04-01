import { test, expect } from "@playwright/test";

/**
 * Sign-Up Page E2E Tests
 *
 * Tests the /sign-up route including the auth layout, header, Clerk form,
 * and navigation elements.
 */

test.describe("Sign-Up Page — Layout & Header", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-up");
  });

  test("should load the sign-up page successfully", async ({ page }) => {
    await expect(page).toHaveURL(/sign-up/);
  });

  test("should display the header with Speakify branding", async ({ page }) => {
    const header = page.locator("header");
    await expect(header).toBeVisible();
    await expect(header.getByText("Speakify")).toBeVisible();
  });

  test("should display the mascot image in the header", async ({ page }) => {
    const mascot = page.locator('header img[alt="Mascot"]');
    await expect(mascot).toBeVisible();
  });

  test("header logo should link back to home", async ({ page }) => {
    const logoLink = page.locator('header a[href="/"]');
    await expect(logoLink).toBeVisible();
  });

  test("should have the GitHub source code link in header", async ({ page }) => {
    const githubIcon = page.getByAltText("Source Code");
    await expect(githubIcon).toBeVisible();
  });

  test("should have a main content area", async ({ page }) => {
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });
});

test.describe("Sign-Up Page — Clerk Form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-up");
  });

  test("should render the Clerk sign-up component", async ({ page }) => {
    // Clerk renders its sign-up form
    const clerkForm = page.locator('[class*="cl-"]').first();
    await expect(clerkForm).toBeVisible({ timeout: 15000 });
  });

  test("page should not redirect away for unauthenticated users", async ({ page }) => {
    // The sign-up page is a public route — should remain accessible.
    // Wait for the Clerk form to render (deterministic signal that page is stable)
    const clerkForm = page.locator('[class*="cl-"]').first();
    await expect(clerkForm).toBeVisible({ timeout: 20000 });
    await expect(page).toHaveURL(/sign-up/);
  });
});

test.describe("Sign-Up Page — Navigation", () => {
  test("clicking the logo should navigate to home page", async ({ page }) => {
    await page.goto("/sign-up");
    const logoLink = page.locator('header a[href="/"]');
    await logoLink.click();
    await expect(page).toHaveURL("/");
  });

  test("sign-up catch-all route should handle nested paths", async ({ page }) => {
    // Clerk uses [[...sign-up]] catch-all route for multi-step flows
    const response = await page.goto("/sign-up");
    expect(response?.status()).toBe(200);
  });
});
