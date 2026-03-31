import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./header", () => ({
  Header: () => <div data-testid="auth-header">Auth Header</div>,
}));

import AuthLayout from "./layout";

describe("Auth Layout", () => {
  it("renders children", () => {
    render(
      <AuthLayout>
        <div data-testid="child">Child content</div>
      </AuthLayout>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders the Header component", () => {
    render(
      <AuthLayout>
        <div>content</div>
      </AuthLayout>
    );
    expect(screen.getByTestId("auth-header")).toBeInTheDocument();
  });

  it("has correct outer div classes", () => {
    const { container } = render(
      <AuthLayout>
        <div>content</div>
      </AuthLayout>
    );
    const outerDiv = container.firstElementChild;
    expect(outerDiv).toHaveClass("flex", "min-h-screen", "flex-col");
  });

  it("renders main element with correct classes", () => {
    render(
      <AuthLayout>
        <div>content</div>
      </AuthLayout>
    );
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass(
      "flex",
      "flex-1",
      "flex-col",
      "items-center",
      "justify-center"
    );
  });

  it("renders children inside main element", () => {
    render(
      <AuthLayout>
        <div data-testid="inner">inner</div>
      </AuthLayout>
    );
    const main = screen.getByRole("main");
    expect(main).toContainElement(screen.getByTestId("inner"));
  });

  it("renders Header before main", () => {
    const { container } = render(
      <AuthLayout>
        <div>content</div>
      </AuthLayout>
    );
    const outerDiv = container.firstElementChild!;
    const children = Array.from(outerDiv.children);
    // Header (data-testid="auth-header") should come before main
    expect(children[0]).toHaveAttribute("data-testid", "auth-header");
    expect(children[1].tagName).toBe("MAIN");
  });
});
