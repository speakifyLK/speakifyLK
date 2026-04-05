import { test, expect } from "@playwright/test";

/**
 * Static Assets E2E Tests
 *
 * Tests that images, SVGs, fonts, and other static assets
 * load correctly and are accessible.
 */

test.describe("Static Assets — Landing Page Images", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
  });

  test("hero SVG should load successfully", async ({ page, browserName }) => {
    if (browserName === "webkit") test.slow();
    const heroImage = page.getByAltText("Hero");
    await expect(heroImage).toBeVisible({ timeout: 30000 });

    // Wait for the image to be fully painted in the viewport
    await heroImage.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const box = await heroImage.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test("mascot SVG should load successfully", async ({ page, browserName }) => {
    if (browserName === "webkit") test.slow();
    const mascot = page.locator('img[alt="Mascot"]');
    await expect(mascot).toBeVisible({ timeout: 30000 });

    const box = await mascot.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test("GitHub icon should load successfully", async ({ page, browserName }) => {
    // GitHub icon is inside <ClerkLoaded>
    if (browserName === "webkit") test.slow();
    const githubIcon = page.getByAltText("Source Code");
    await expect(githubIcon).toBeVisible({ timeout: 30000 });

    const box = await githubIcon.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
  });
});

test.describe("Static Assets — Footer Images (Desktop)", () => {
  test("Sinhala flag image should load on desktop", async ({ page, browserName }) => {
    if (browserName === "webkit") test.slow();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "load" });

    const sinhalaFlag = page.getByAltText("Sinhala");
    await expect(sinhalaFlag).toBeVisible({ timeout: 30000 });

    const box = await sinhalaFlag.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
  });

  test("Tamil flag image should load on desktop", async ({ page, browserName }) => {
    if (browserName === "webkit") test.slow();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "load" });

    const tamilFlag = page.getByAltText("Tamil");
    await expect(tamilFlag).toBeVisible({ timeout: 30000 });

    const box = await tamilFlag.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
  });
});

test.describe("Static Assets — Auth Page Images", () => {
  test("mascot should load on sign-in page", async ({ page, browserName }) => {
    if (browserName === "webkit") test.slow();
    await page.goto("/sign-in", { waitUntil: "load" });
    const mascot = page.locator('img[alt="Mascot"]');
    await expect(mascot).toBeVisible({ timeout: 30000 });
  });

  test("mascot should load on sign-up page", async ({ page, browserName }) => {
    if (browserName === "webkit") test.slow();
    await page.goto("/sign-up", { waitUntil: "load" });
    const mascot = page.locator('img[alt="Mascot"]');
    await expect(mascot).toBeVisible({ timeout: 30000 });
  });

  test("GitHub icon should load on sign-in page", async ({ page }) => {
    await page.goto("/sign-in");
    const githubIcon = page.getByAltText("Source Code");
    await expect(githubIcon).toBeVisible();
  });

  test("GitHub icon should load on sign-up page", async ({ page, browserName }) => {
    // GitHub icon is inside <ClerkLoaded> — webkit loads Clerk slowly
    if (browserName === "webkit") test.slow();
    await page.goto("/sign-up");
    const githubIcon = page.getByAltText("Source Code");
    await expect(githubIcon).toBeVisible({ timeout: 30000 });
  });
});

test.describe("Static Assets — Direct Asset Requests", () => {
  test("favicon.ico should be accessible", async ({ request }) => {
    const response = await request.get("/favicon.ico");
    expect(response.status()).toBeLessThan(400);
  });

  test("hero.svg should be accessible", async ({ request }) => {
    const response = await request.get("/hero.svg");
    expect(response.status()).toBe(200);
  });

  test("mascot.svg should be accessible", async ({ request }) => {
    const response = await request.get("/mascot.svg");
    expect(response.status()).toBe(200);
  });

  test("lk.jpg (Sri Lankan flag) should be accessible", async ({ request }) => {
    const response = await request.get("/lk.jpg");
    expect(response.status()).toBe(200);
  });

  test("github.svg should be accessible", async ({ request }) => {
    const response = await request.get("/github.svg");
    expect(response.status()).toBe(200);
  });
});

test.describe("Static Assets — Image Loading Performance", () => {
  test("all images on landing page should load without broken images", async ({
    page,
    browserName,
  }) => {
    // Webkit may need more time for Clerk to load and render all images
    if (browserName === "webkit") test.slow();
    await page.goto("/", { waitUntil: "load" });

    // Wait for key images to be fully loaded rather than using a fixed timeout.
    // The hero and mascot images are always present outside ClerkLoaded gates.
    const heroImage = page.getByAltText("Hero");
    const mascotImage = page.locator('img[alt="Mascot"]');
    await expect(heroImage).toBeVisible({ timeout: 30000 });
    await expect(mascotImage).toBeVisible({ timeout: 30000 });

    // Wait for all images to have their naturalWidth set (i.e., fully loaded)
    await page.waitForFunction(
      () => {
        const imgs = document.querySelectorAll("img");
        return Array.from(imgs).every((img) => img.complete && img.naturalWidth > 0);
      },
      { timeout: 30000 }
    );

    const images = page.locator("img");
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const image = images.nth(i);
      const isVisible = await image.isVisible();

      if (isVisible) {
        // Scroll into view to ensure bounding box is computed
        await image.scrollIntoViewIfNeeded();
        const box = await image.boundingBox();
        expect(
          box,
          `Image ${i} (${await image.getAttribute("alt")}) has no bounding box`
        ).toBeTruthy();
        expect(
          box!.width,
          `Image ${i} (${await image.getAttribute("alt")}) has zero width`
        ).toBeGreaterThan(0);
      }
    }
  });
});

test.describe("Static Assets — Audio Files", () => {
  // Audio files (.wav, .mp3) are NOT excluded from Clerk middleware matcher,
  // so they require authentication. We verify they return a response (redirect/block)
  // rather than crashing.
  test("correct.wav request should not crash the server", async ({ request }) => {
    const response = await request.get("/correct.wav");
    // Clerk middleware intercepts — returns redirect/block, not 200.
    // Assert the server did not return a 5xx error.
    expect(response.status()).toBeLessThan(500);
  });

  test("incorrect.wav request should not crash the server", async ({ request }) => {
    const response = await request.get("/incorrect.wav");
    expect(response.status()).toBeLessThan(500);
  });

  test("finish.mp3 request should not crash the server", async ({ request }) => {
    const response = await request.get("/finish.mp3");
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("Static Assets — Content Types", () => {
  test("SVG files should have correct content type", async ({ request }) => {
    const response = await request.get("/hero.svg");
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("svg");
  });

  test("JPG files should have correct content type", async ({ request }) => {
    const response = await request.get("/lk.jpg");
    const contentType = response.headers()["content-type"];
    expect(contentType).toMatch(/image\/(jpeg|jpg)/);
  });
});
