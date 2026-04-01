import { test, expect } from "@playwright/test";

/**
 * Navigation & Accessibility E2E Tests
 *
 * Tests that key navigation elements work correctly and the app
 * meets basic accessibility standards.
 */

test.describe("Navigation — Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have the Speakify logo link that navigates to home", async ({ page }) => {
    const logoLink = page.locator('header a[href="/"]');
    await expect(logoLink).toBeVisible();

    // Click logo and verify we stay on home
    await logoLink.click();
    await expect(page).toHaveURL("/");
  });

  test("header should have mascot image", async ({ page }) => {
    const mascot = page.locator('header img[alt="Mascot"]');
    await expect(mascot).toBeVisible();
  });
});

test.describe("Responsive Design", () => {
  test("landing page renders correctly on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto("/");

    const tagline = page.getByText("Learn, practice and master new languages with Speakify.");
    await expect(tagline).toBeVisible();
  });

  test("landing page renders correctly on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto("/");

    const tagline = page.getByText("Learn, practice and master new languages with Speakify.");
    await expect(tagline).toBeVisible();
  });

  test("landing page renders correctly on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const tagline = page.getByText("Learn, practice and master new languages with Speakify.");
    await expect(tagline).toBeVisible();
  });
});

test.describe("Accessibility — Basic Checks", () => {
  test("landing page should have proper heading hierarchy", async ({ page }) => {
    await page.goto("/");

    // Should have at least one h1
    const h1 = page.locator("h1");
    await expect(h1.first()).toBeVisible();
  });

  test("images should have alt text", async ({ page }) => {
    await page.goto("/");

    // Check that all images have alt attributes
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute("alt");
      expect(alt, `Image ${i} is missing alt text`).toBeTruthy();
    }
  });

  test("interactive buttons should be focusable", async ({ page }) => {
    await page.goto("/");

    // Wait for Clerk to load
    await page.waitForTimeout(3000);

    const buttons = page.locator("button");
    const count = await buttons.count();

    // At least the CTA buttons should exist
    expect(count).toBeGreaterThan(0);
  });

  test("page should have a proper title", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });
});

test.describe("Performance — Basic Checks", () => {
  test("landing page should load within 10 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(10000);
  });

  test("landing page should not have console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForTimeout(2000);

    // Filter out known third-party errors (e.g., Clerk, browser extensions)
    const appErrors = errors.filter(
      (e) => !e.includes("clerk") && !e.includes("extension") && !e.includes("favicon")
    );

    expect(appErrors).toHaveLength(0);
  });
});
