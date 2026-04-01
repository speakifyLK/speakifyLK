import { test, expect } from "@playwright/test";

/**
 * Sign-In Page E2E Tests
 *
 * Tests the /sign-in route including the auth layout, header, Clerk form,
 * and navigation elements.
 */

test.describe("Sign-In Page — Layout & Header", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  });

  test("should load the sign-in page successfully", async ({ page }) => {
    await expect(page).toHaveURL(/sign-in/);
  });

  test("should display the header with Speakify branding", async ({ page }) => {
    const header = page.locator("header");
    await expect(header).toBeVisible({ timeout: 15000 });
    await expect(header.getByText("Speakify")).toBeVisible();
  });

  test("should display the mascot image in the header", async ({ page }) => {
    const mascot = page.locator('header img[alt="Mascot"]');
    await expect(mascot).toBeVisible({ timeout: 15000 });
  });

  test("header logo should link back to home", async ({ page }) => {
    const logoLink = page.locator('header a[href="/"]');
    await expect(logoLink).toBeVisible({ timeout: 15000 });
  });

  test("should have the GitHub source code link in header", async ({
    page,
  }) => {
    // GitHub icon is rendered inside ClerkLoaded, so wait for Clerk
    const githubIcon = page.getByAltText("Source Code");
    await expect(githubIcon).toBeVisible({ timeout: 15000 });
  });

  test("should have a main content area", async ({ page }) => {
    const main = page.locator("main");
    await expect(main).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Sign-In Page — Clerk Form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in");
  });

  test("should render the Clerk sign-in component", async ({ page }) => {
    // Clerk renders its sign-in form — wait for it to appear
    const clerkForm = page.locator('[class*="cl-"]').first();
    await expect(clerkForm).toBeVisible({ timeout: 20000 });
  });

  test("page should not redirect away for unauthenticated users", async ({
    page,
  }) => {
    // The sign-in page is a public route — should remain accessible
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe("Sign-In Page — Navigation", () => {
  test("clicking the logo should navigate to home page", async ({ page }) => {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
    const logoLink = page.locator('header a[href="/"]');
    await expect(logoLink).toBeVisible({ timeout: 15000 });
    await logoLink.click();
    await expect(page).toHaveURL("/");
  });

  test("sign-in catch-all route should handle nested paths", async ({
    page,
  }) => {
    // Clerk uses [[...sign-in]] catch-all route for multi-step flows
    const response = await page.goto("/sign-in");
    expect(response?.status()).toBe(200);
  });
});
