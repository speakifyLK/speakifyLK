import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration for SpeakifyLK
 *
 * These tests run against the live dev server and test the application
 * from an end-user perspective through the browser.
 */
export default defineConfig({
  testDir: "./tests",
  /* Vitest unit tests may live under tests/ (e.g. helpers); do not run them as Playwright files. */
  testIgnore: "**/*.test.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html"],
    [
      "allure-playwright",
      {
        resultsDir: "./allure-results",
        labels: [{ name: "layer", value: "e2e" }],
      },
    ],
  ],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    /* Global timeout for actions/assertions — generous for Clerk loading */
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  /* Auto-start the dev server before running tests */
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for Next.js to start
  },
});
