import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockToggleTheme = vi.fn();
const mockUseTheme = vi.hoisted(() => vi.fn());

vi.mock("./theme-provider", () => ({
  useTheme: mockUseTheme,
}));

import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  it("renders moon icon in light mode", () => {
    mockUseTheme.mockReturnValue({ theme: "light", toggleTheme: mockToggleTheme });

    render(<ThemeToggle />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Switch to dark mode");
    expect(button).toHaveAttribute("title", "Switch to dark mode");
  });

  it("renders sun icon in dark mode", () => {
    mockUseTheme.mockReturnValue({ theme: "dark", toggleTheme: mockToggleTheme });

    render(<ThemeToggle />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Switch to light mode");
    expect(button).toHaveAttribute("title", "Switch to light mode");
  });

  it("calls toggleTheme when clicked", async () => {
    mockToggleTheme.mockClear();
    mockUseTheme.mockReturnValue({ theme: "light", toggleTheme: mockToggleTheme });

    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button"));

    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it("has correct styling classes", () => {
    mockUseTheme.mockReturnValue({ theme: "light", toggleTheme: mockToggleTheme });

    render(<ThemeToggle />);

    const button = screen.getByRole("button");
    expect(button.className).toContain("rounded-lg");
    expect(button.className).toContain("transition-all");
  });
});
