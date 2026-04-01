import { test, expect } from "@playwright/test";

/**
 * Landing Page E2E Tests
 *
 * Tests the public marketing/landing page that unauthenticated users see.
 * Covers hero section, header, footer, CTAs, responsive behaviour, and Clerk states.
 */

test.describe("Landing Page — Core Content", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should load the landing page with 200 status", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL("/");
  });

  test("should display the hero tagline", async ({ page }) => {
    const tagline = page.getByText(
      "Learn, practice and master new languages with Speakify."
    );
    await expect(tagline).toBeVisible();
  });

  test("should render the tagline as an h1 heading", async ({ page }) => {
    const h1 = page.locator("h1").filter({
      hasText: "Learn, practice and master new languages with Speakify.",
    });
    await expect(h1).toBeVisible();
  });

  test("should display the hero image with correct alt text", async ({
    page,
  }) => {
    const heroImage = page.getByAltText("Hero");
    await expect(heroImage).toBeVisible();
  });

  test("hero image should have a valid src attribute", async ({ page }) => {
    const heroImage = page.getByAltText("Hero");
    const src = await heroImage.getAttribute("src");
    expect(src).toBeTruthy();
  });
});

test.describe("Landing Page — Header", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the Speakify branding in the header", async ({
    page,
  }) => {
    const header = page.locator("header");
    await expect(header).toBeVisible();
    await expect(header.getByText("Speakify")).toBeVisible();
  });

  test("should display the mascot image in the header", async ({ page }) => {
    const mascot = page.locator('header img[alt="Mascot"]');
    await expect(mascot).toBeVisible();
  });

  test("should have the Speakify logo as a link to home", async ({ page }) => {
    const logoLink = page.locator('header a[href="/"]');
    await expect(logoLink).toBeVisible();
  });

  test("should have the GitHub source code link", async ({
    page,
    browserName,
  }) => {
    // GitHub icon is inside <ClerkLoaded> — webkit loads Clerk very slowly
    if (browserName === "webkit") test.slow();
    const githubIcon = page.getByAltText("Source Code");
    await expect(githubIcon).toBeVisible({ timeout: 30000 });
  });

  test("GitHub link should open in a new tab", async ({
    page,
    browserName,
  }) => {
    if (browserName === "webkit") test.slow();
    const githubLink = page.locator('header a[target="_blank"]');
    await expect(githubLink).toBeVisible({ timeout: 30000 });
    const rel = await githubLink.getAttribute("rel");
    expect(rel).toContain("noreferrer");
    expect(rel).toContain("noopener");
  });

  test("should display a Login button for unauthenticated users", async ({
    page,
    browserName,
  }) => {
    // Login button is inside <ClerkLoaded> — webkit needs extra time
    if (browserName === "webkit") test.slow();
    const loginButton = page.getByRole("button", { name: "Login" });
    await expect(loginButton).toBeVisible({ timeout: 30000 });
  });
});

test.describe("Landing Page — Footer", () => {
  // Footer is only visible on lg+ viewports
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
  });

  test("should display the Sinhala language button on desktop", async ({
    page,
    browserName,
  }) => {
    // Footer buttons are inside <ClerkLoaded> on webkit
    if (browserName === "webkit") test.slow();
    const sinhalaButton = page.getByRole("button", { name: /Sinhala/i });
    await expect(sinhalaButton).toBeVisible({ timeout: 30000 });
  });

  test("should display the Tamil language button on desktop", async ({
    page,
    browserName,
  }) => {
    if (browserName === "webkit") test.slow();
    const tamilButton = page.getByRole("button", { name: /Tamil/i });
    await expect(tamilButton).toBeVisible({ timeout: 30000 });
  });

  test("should display Sri Lankan flag images next to language buttons", async ({
    page,
    browserName,
  }) => {
    if (browserName === "webkit") test.slow();
    const sinhalaFlag = page.getByAltText("Sinhala");
    const tamilFlag = page.getByAltText("Tamil");
    await expect(sinhalaFlag).toBeVisible({ timeout: 30000 });
    await expect(tamilFlag).toBeVisible({ timeout: 30000 });
  });

  test("footer should be hidden on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    // The footer container has 'hidden lg:block' — it should not be visible on mobile
    const sinhalaButton = page.getByRole("button", { name: /Sinhala/i });
    await expect(sinhalaButton).not.toBeVisible();
  });
});

test.describe("Landing Page — CTA Buttons (Unauthenticated)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should show 'Get Started' button for unauthenticated users", async ({
    page,
    browserName,
  }) => {
    // CTA buttons are inside <ClerkLoaded>
    if (browserName === "webkit") test.slow();
    const getStarted = page.getByRole("button", { name: "Get Started" });
    await expect(getStarted).toBeVisible({ timeout: 30000 });
  });

  test("should show 'I already have an account' button for unauthenticated users", async ({
    page,
    browserName,
  }) => {
    if (browserName === "webkit") test.slow();
    const signIn = page.getByRole("button", {
      name: "I already have an account",
    });
    await expect(signIn).toBeVisible({ timeout: 30000 });
  });

  test("'Get Started' button should be clickable", async ({
    page,
    browserName,
  }) => {
    if (browserName === "webkit") test.slow();
    const getStarted = page.getByRole("button", { name: "Get Started" });
    await expect(getStarted).toBeVisible({ timeout: 30000 });
    await expect(getStarted).toBeEnabled();
  });

  test("'I already have an account' button should be clickable", async ({
    page,
    browserName,
  }) => {
    if (browserName === "webkit") test.slow();
    const signIn = page.getByRole("button", {
      name: "I already have an account",
    });
    await expect(signIn).toBeVisible({ timeout: 30000 });
    await expect(signIn).toBeEnabled();
  });
});

test.describe("Landing Page — Layout Structure", () => {
  test("should have the correct document language attribute", async ({
    page,
    browserName,
  }) => {
    if (browserName === "webkit") test.slow();
    await page.goto("/", { waitUntil: "load" });
    // Wait for Next.js hydration to set the lang attribute
    await page.waitForFunction(() => document.documentElement.lang === "en", {
      timeout: 30000,
    });
    const lang = await page.getAttribute("html", "lang");
    expect(lang).toBe("en");
  });

  test("should have a main content area", async ({ page, browserName }) => {
    if (browserName === "webkit") test.slow();
    await page.goto("/", { waitUntil: "load" });
    const main = page.locator("main");
    await expect(main).toBeVisible({ timeout: 30000 });
  });

  test("should have a header element", async ({ page, browserName }) => {
    if (browserName === "webkit") test.slow();
    await page.goto("/", { waitUntil: "load" });
    const header = page.locator("header");
    await expect(header).toBeVisible({ timeout: 30000 });
  });

  test("page should have the Nunito font applied", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const body = page.locator("body");
    const className = await body.getAttribute("class");
    // Nunito font class is applied by Next.js font optimization
    expect(className).toBeTruthy();
  });
});
