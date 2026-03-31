import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./header", () => ({
  Header: () => <div data-testid="marketing-header">Marketing Header</div>,
}));

vi.mock("./footer", () => ({
  Footer: () => <div data-testid="marketing-footer">Marketing Footer</div>,
}));

import MarketingLayout from "./layout";

describe("Marketing Layout", () => {
  it("renders children", () => {
    render(
      <MarketingLayout>
        <div data-testid="child">Child content</div>
      </MarketingLayout>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders the Header component", () => {
    render(
      <MarketingLayout>
        <div>content</div>
      </MarketingLayout>
    );
    expect(screen.getByTestId("marketing-header")).toBeInTheDocument();
  });

  it("renders the Footer component", () => {
    render(
      <MarketingLayout>
        <div>content</div>
      </MarketingLayout>
    );
    expect(screen.getByTestId("marketing-footer")).toBeInTheDocument();
  });

  it("has correct outer div classes", () => {
    const { container } = render(
      <MarketingLayout>
        <div>content</div>
      </MarketingLayout>
    );
    const outerDiv = container.firstElementChild;
    expect(outerDiv).toHaveClass("flex", "min-h-screen", "flex-col");
  });

  it("renders main element with correct classes", () => {
    render(
      <MarketingLayout>
        <div>content</div>
      </MarketingLayout>
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
      <MarketingLayout>
        <div data-testid="inner">inner</div>
      </MarketingLayout>
    );
    const main = screen.getByRole("main");
    expect(main).toContainElement(screen.getByTestId("inner"));
  });

  it("renders Header, main, Footer in correct order", () => {
    const { container } = render(
      <MarketingLayout>
        <div>content</div>
      </MarketingLayout>
    );
    const outerDiv = container.firstElementChild!;
    const children = Array.from(outerDiv.children);
    expect(children).toHaveLength(3);
    expect(children[0]).toHaveAttribute("data-testid", "marketing-header");
    expect(children[1].tagName).toBe("MAIN");
    expect(children[2]).toHaveAttribute("data-testid", "marketing-footer");
  });
});
