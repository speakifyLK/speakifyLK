import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/mobile-header", () => ({
  MobileHeader: () => <div data-testid="mobile-header">MobileHeader</div>,
}));

vi.mock("@/components/sidebar", () => ({
  Sidebar: ({ className }: any) => (
    <div data-testid="sidebar" className={className}>
      Sidebar
    </div>
  ),
}));

vi.mock("@/components/chat/chat-button", () => ({
  ChatButton: () => <div data-testid="chat-button">ChatButton</div>,
}));

import MainLayout from "./layout";

describe("MainLayout", () => {
  it("renders children", () => {
    render(
      <MainLayout>
        <div data-testid="child">Child content</div>
      </MainLayout>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders MobileHeader", () => {
    render(
      <MainLayout>
        <div>content</div>
      </MainLayout>
    );
    expect(screen.getByTestId("mobile-header")).toBeInTheDocument();
  });

  it("renders Sidebar with hidden lg:flex class", () => {
    render(
      <MainLayout>
        <div>content</div>
      </MainLayout>
    );
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveClass("hidden", "lg:flex");
  });

  it("renders ChatButton", () => {
    render(
      <MainLayout>
        <div>content</div>
      </MainLayout>
    );
    expect(screen.getByTestId("chat-button")).toBeInTheDocument();
  });

  it("renders main element with correct classes", () => {
    const { container } = render(
      <MainLayout>
        <div>content</div>
      </MainLayout>
    );
    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass("h-full", "pt-[50px]", "lg:pl-[256px]", "lg:pt-0");
  });

  it("renders inner wrapper div with correct classes", () => {
    const { container } = render(
      <MainLayout>
        <div>content</div>
      </MainLayout>
    );
    const inner = container.querySelector("main > div");
    expect(inner).toBeInTheDocument();
    expect(inner).toHaveClass("mx-auto", "h-full", "max-w-[1056px]", "pt-6");
  });

  it("renders children inside the inner wrapper", () => {
    render(
      <MainLayout>
        <div data-testid="inner-child">inner</div>
      </MainLayout>
    );
    const child = screen.getByTestId("inner-child");
    expect(child).toBeInTheDocument();
  });
});
