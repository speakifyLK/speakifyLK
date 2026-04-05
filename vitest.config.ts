import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next", "tests/**/*.spec.ts"], // Playwright specs only; allow tests/*.e2e.test.ts
    reporters: [
      "default",
      [
        "allure-vitest/reporter",
        {
          resultsDir: "./allure-results",
          labels: [{ name: "layer", value: "unit" }],
        },
      ],
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "lib/**",
        "actions/**",
        "store/**",
        "db/**",
        "components/**",
        "app/**",
        "config/index.ts",
        "constants.ts",
        "middleware.ts",
        "scripts/**",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.png",
        "**/*.ico",
        "**/*.css",
        "**/*.json",
        "**/*.yml",
        "**/*.yaml",
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
