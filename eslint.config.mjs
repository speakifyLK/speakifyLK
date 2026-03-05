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
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Demote to warning: intentional SSR hydration-guard pattern (useEffect + setState with empty deps)
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Ignore generated/build output and non-app tooling scripts
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "jira/**",
      "scripts/**",
    ],
  },
);
