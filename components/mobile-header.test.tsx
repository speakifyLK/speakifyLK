import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./mobile-sidebar", () => ({
  MobileSidebar: () => <div data-testid="mobile-sidebar" />,
}));

import { MobileHeader } from "./mobile-header";

describe("MobileHeader", () => {
  it("renders a nav element", () => {
    render(<MobileHeader />);

    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();
  });

  it("renders MobileSidebar inside nav", () => {
    render(<MobileHeader />);

    expect(screen.getByTestId("mobile-sidebar")).toBeInTheDocument();
  });

  it("nav has correct className", () => {
    render(<MobileHeader />);

    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("bg-green-500");
    expect(nav.className).toContain("fixed");
  });
});
