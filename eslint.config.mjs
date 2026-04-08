import pluginNext from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  // Next.js core-web-vitals flat config (includes @next/next plugin + rules)
  pluginNext.configs["core-web-vitals"],
  // React Hooks rules
  {
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  // TypeScript rules
  ...tseslint.configs.recommended,
  // Disable style rules that conflict with Prettier
  prettierConfig,
  // Project-wide rule overrides
  {
    rules: {
      // Allow unused variables/params when prefixed with _
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Relaxed rules for test files — mocks and test utilities legitimately use
  // `any`, `require()` inside vi.mock factories, and raw `<img>` in stubs.
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@next/next/no-img-element": "off",
    },
  },
  // Ignore generated/build output and non-app tooling scripts
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
      "jira/**",
      "scripts/**",
      "playwright-report/**",
      "test-results/**"
    ],
  }
);
