import { test, expect } from "@playwright/test";

/**
 * Landing Page E2E Tests
 *
 * Tests the public marketing/landing page that unauthenticated users see.
 * This page should be accessible without login.
 */

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should load the landing page successfully", async ({ page }) => {
    // Page should return 200 and be interactive
    await expect(page).toHaveURL("/");
  });

  test("should display the Speakify branding in the header", async ({
    page,
  }) => {
    // The header contains the Speakify logo and name
    const header = page.locator("header");
    await expect(header).toBeVisible();
    await expect(header.getByText("Speakify")).toBeVisible();
  });

  test("should display the hero tagline", async ({ page }) => {
    // Main hero text
    const tagline = page.getByText(
      "Learn, practice and master new languages with Speakify."
    );
    await expect(tagline).toBeVisible();
  });

  test("should display the hero image", async ({ page }) => {
    const heroImage = page.getByAltText("Hero");
    await expect(heroImage).toBeVisible();
  });

  test("should show 'Get Started' button for unauthenticated users", async ({
    page,
  }) => {
    // When signed out, the CTA buttons should be visible
    const getStarted = page.getByRole("button", { name: "Get Started" });
    // Wait a bit for Clerk to load
    await expect(getStarted).toBeVisible({ timeout: 10000 });
  });

  test("should show 'I already have an account' button for unauthenticated users", async ({
    page,
  }) => {
    const signIn = page.getByRole("button", {
      name: "I already have an account",
    });
    await expect(signIn).toBeVisible({ timeout: 10000 });
  });

  test("should have the GitHub source code link", async ({ page }) => {
    const githubLink = page.getByAltText("Source Code");
    await expect(githubLink).toBeVisible();
  });
});
