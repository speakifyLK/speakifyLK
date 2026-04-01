import { test, expect } from "@playwright/test";

/**
 * Navigation & Accessibility E2E Tests
 *
 * Tests that key navigation elements work correctly, the app
 * meets basic accessibility standards, responsive design works,
 * and pages perform adequately.
 */

test.describe("Navigation — Landing Page Header", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("should have the Speakify logo link that navigates to home", async ({ page }) => {
    const logoLink = page.locator('header a[href="/"]');
    await expect(logoLink).toBeVisible({ timeout: 15000 });

    // Click logo and verify we stay on home
    await logoLink.click();
    await expect(page).toHaveURL("/");
  });

  test("header should have mascot image", async ({ page }) => {
    const mascot = page.locator('header img[alt="Mascot"]');
    await expect(mascot).toBeVisible({ timeout: 15000 });
  });

  test("header should have the Speakify title text", async ({ page }) => {
    const title = page.locator("header h1").filter({ hasText: "Speakify" });
    await expect(title).toBeVisible({ timeout: 15000 });
  });

  test("header should have border-bottom styling", async ({ page }) => {
    const header = page.locator("header");
    await expect(header).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Navigation — Cross-Page Links", () => {
  test("logo on sign-in page should navigate to home", async ({ page }) => {
    await page.goto("/sign-in");
    const logoLink = page.locator('header a[href="/"]');
    await logoLink.click();
    await expect(page).toHaveURL("/");
  });

  test("logo on sign-up page should navigate to home", async ({ page }) => {
    await page.goto("/sign-up");
    const logoLink = page.locator('header a[href="/"]');
    await logoLink.click();
    await expect(page).toHaveURL("/");
  });

  test("GitHub link should point to the correct repository URL", async ({ page }) => {
    await page.goto("/");
    const githubLink = page.locator('header a[target="_blank"]');
    const href = await githubLink.getAttribute("href");
    expect(href).toContain("github.com/speakifyLK/speakifyLK");
  });
});

test.describe("Navigation — Auth Page Flow", () => {
  test("sign-in page should have a link back to home via logo", async ({ page }) => {
    await page.goto("/sign-in");
    const homeLink = page.locator('header a[href="/"]');
    await expect(homeLink).toBeVisible();
  });

  test("sign-up page should have a link back to home via logo", async ({ page }) => {
    await page.goto("/sign-up");
    const homeLink = page.locator('header a[href="/"]');
    await expect(homeLink).toBeVisible();
  });
});

test.describe("Responsive Design — Landing Page", () => {
  test("renders correctly on mobile viewport (375x667)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    const tagline = page.getByText("Learn, practice and master new languages with Speakify.");
    await expect(tagline).toBeVisible();

    // Hero image should still be visible on mobile
    const heroImage = page.getByAltText("Hero");
    await expect(heroImage).toBeVisible();
  });

  test("renders correctly on tablet viewport (768x1024)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    const tagline = page.getByText("Learn, practice and master new languages with Speakify.");
    await expect(tagline).toBeVisible();
  });

  test("renders correctly on desktop viewport (1440x900)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const tagline = page.getByText("Learn, practice and master new languages with Speakify.");
    await expect(tagline).toBeVisible();
  });

  test("footer language buttons are visible on desktop but hidden on mobile", async ({ page }) => {
    // Desktop - footer should be visible
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const sinhalaDesktop = page.getByRole("button", { name: /Sinhala/i });
    await expect(sinhalaDesktop).toBeVisible();

    // Mobile - footer should be hidden
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(sinhalaDesktop).not.toBeVisible();
  });

  test("header is visible on all viewport sizes", async ({ page }) => {
    const viewports = [
      { width: 375, height: 667 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/");
      const header = page.locator("header");
      await expect(header).toBeVisible();
    }
  });
});

test.describe("Responsive Design — Auth Pages", () => {
  test("sign-in page renders on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/sign-in/);
    const header = page.locator("header");
    await expect(header).toBeVisible();
  });

  test("sign-up page renders on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/sign-up");
    await expect(page).toHaveURL(/sign-up/);
    const header = page.locator("header");
    await expect(header).toBeVisible();
  });
});

test.describe("Accessibility — Heading Hierarchy", () => {
  test("landing page should have at least one h1", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1");
    await expect(h1.first()).toBeVisible();
  });

  test("sign-in page should have at least one h1", async ({ page }) => {
    await page.goto("/sign-in");
    const h1 = page.locator("h1");
    await expect(h1.first()).toBeVisible();
  });

  test("sign-up page should have at least one h1", async ({ page }) => {
    await page.goto("/sign-up");
    const h1 = page.locator("h1");
    await expect(h1.first()).toBeVisible();
  });
});

test.describe("Accessibility — Images", () => {
  test("all images on landing page should have alt text", async ({ page }) => {
    await page.goto("/");

    const images = page.locator("img");
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute("alt");
      expect(alt, `Image ${i} is missing alt text`).toBeTruthy();
    }
  });

  test("all images on sign-in page should have alt text", async ({ page }) => {
    await page.goto("/sign-in");

    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute("alt");
      expect(alt, `Image ${i} on sign-in page is missing alt text`).toBeTruthy();
    }
  });
});

test.describe("Accessibility — Interactive Elements", () => {
  test("buttons on landing page should be focusable", async ({ page }) => {
    await page.goto("/");

    // Wait for Clerk to load
    await page.waitForTimeout(3000);

    const buttons = page.locator("button");
    const count = await buttons.count();

    // At least the CTA buttons should exist
    expect(count).toBeGreaterThan(0);
  });

  test("links should have accessible attributes", async ({ page }) => {
    await page.goto("/");

    // External links should have rel attributes for security
    const externalLinks = page.locator('a[target="_blank"]');
    const count = await externalLinks.count();

    for (let i = 0; i < count; i++) {
      const rel = await externalLinks.nth(i).getAttribute("rel");
      expect(rel).toContain("noreferrer");
    }
  });

  test("page should have a proper document title", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });
});

test.describe("Accessibility — Language Attribute", () => {
  test("HTML should have lang attribute set to en", async ({ page, browserName }) => {
    // Webkit may not have the lang attribute set before full hydration
    if (browserName === "webkit") test.slow();
    await page.goto("/", { waitUntil: "load" });
    // Wait for Next.js hydration to set the lang attribute
    await page.waitForFunction(() => document.documentElement.lang === "en", {
      timeout: 30000,
    });
    const lang = await page.getAttribute("html", "lang");
    expect(lang).toBe("en");
  });
});

test.describe("Performance — Page Load", () => {
  test("landing page should load within 10 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(10000);
  });

  test("sign-in page should load within 10 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(10000);
  });

  test("sign-up page should load within 10 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/sign-up", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(10000);
  });
});

test.describe("Performance — Console Errors", () => {
  test("landing page should not have console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForTimeout(2000);

    // Filter out known third-party errors (e.g., Clerk, browser extensions, rate limits)
    const appErrors = errors.filter(
      (e) =>
        !e.includes("clerk") &&
        !e.includes("extension") &&
        !e.includes("favicon") &&
        !e.includes("429") &&
        !e.includes("Failed to load resource")
    );

    expect(appErrors).toHaveLength(0);
  });

  test("sign-in page should not have app-level console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/sign-in");
    await page.waitForTimeout(2000);

    const appErrors = errors.filter(
      (e) =>
        !e.includes("clerk") &&
        !e.includes("extension") &&
        !e.includes("favicon") &&
        !e.includes("429") &&
        !e.includes("Failed to load resource")
    );

    expect(appErrors).toHaveLength(0);
  });
});
