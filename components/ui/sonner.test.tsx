import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("sonner", () => ({
  Toaster: ({ toastOptions: _toastOptions, ...props }: Record<string, unknown>) => (
    <div data-testid="sonner-toaster" {...props} />
  ),
}));

vi.mock("../theme-provider", () => ({
  useTheme: () => ({ theme: "dark" }),
}));

import { Toaster } from "./sonner";

describe("Toaster", () => {
  it("renders without error", () => {
    render(<Toaster />);
    expect(screen.getByTestId("sonner-toaster")).toBeInTheDocument();
  });

  it("passes theme prop from useTheme", () => {
    render(<Toaster />);
    const el = screen.getByTestId("sonner-toaster");
    expect(el.getAttribute("theme")).toBe("dark");
  });

  it("applies the toaster class", () => {
    render(<Toaster />);
    const el = screen.getByTestId("sonner-toaster");
    expect(el.className).toContain("toaster");
  });

  it("forwards additional props", () => {
    render(<Toaster data-custom="hello" />);
    const el = screen.getByTestId("sonner-toaster");
    expect(el.getAttribute("data-custom")).toBe("hello");
  });
});
