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
  it("renders the default light theme during SSR", () => {
    // SSR renders the initial theme value; client-side effects do not run on the server.
    const html = renderToString(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(html).toContain('data-testid="theme-value">light</div>');
  });
});
