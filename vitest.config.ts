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
    exclude: ["node_modules", ".next", "tests/**"], // keep Playwright E2E separate
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
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
