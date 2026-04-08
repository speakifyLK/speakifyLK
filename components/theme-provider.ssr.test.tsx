/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { ThemeProvider, useTheme } from "./theme-provider";

const ThemeConsumer = () => {
  const { theme } = useTheme();
  return <div data-testid="theme-value">{theme}</div>;
};

describe("ThemeProvider in Server Environment", () => {
  it("defaults to light theme during SSR (window is undefined)", () => {
    // Expected to evaluate typeof window === 'undefined' branch
    const html = renderToString(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(html).toContain('data-testid="theme-value">light</div>');
  });
});
