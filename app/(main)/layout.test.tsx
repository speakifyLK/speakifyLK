import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockGetIsAdmin = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin", () => ({
  getIsAdmin: mockGetIsAdmin,
}));

vi.mock("@/components/mobile-header", () => ({
  MobileHeader: () => <div data-testid="mobile-header">MobileHeader</div>,
}));

vi.mock("@/components/sidebar", () => ({
  Sidebar: ({ className, isAdmin }: any) => (
    <div data-testid="sidebar" className={className} data-is-admin={isAdmin ? "true" : "false"}>
      Sidebar
    </div>
  ),
}));

vi.mock("@/components/chat/chat-button", () => ({
  ChatButton: () => <div data-testid="chat-button">ChatButton</div>,
}));

import MainLayout from "./layout";

describe("MainLayout", () => {
  it("renders children", async () => {
    mockGetIsAdmin.mockResolvedValue(false);
    const layout = await MainLayout({
      children: <div data-testid="child">Child content</div>,
    });
    render(layout);
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Child content")).toBeInTheDocument();
  });

  it("renders MobileHeader", async () => {
    mockGetIsAdmin.mockResolvedValue(false);
    const layout = await MainLayout({ children: <div>content</div> });
    render(layout);
    expect(screen.getByTestId("mobile-header")).toBeInTheDocument();
  });

  it("renders Sidebar with hidden lg:flex class", async () => {
    mockGetIsAdmin.mockResolvedValue(false);
    const layout = await MainLayout({ children: <div>content</div> });
    render(layout);
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveClass("hidden", "lg:flex");
  });

  it("renders ChatButton", async () => {
    mockGetIsAdmin.mockResolvedValue(false);
    const layout = await MainLayout({ children: <div>content</div> });
    render(layout);
    expect(screen.getByTestId("chat-button")).toBeInTheDocument();
  });

  it("renders main element with correct classes", async () => {
    mockGetIsAdmin.mockResolvedValue(false);
    const layout = await MainLayout({ children: <div>content</div> });
    const { container } = render(layout);
    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass("h-full", "pt-[50px]", "lg:pl-[256px]", "lg:pt-0");
  });

  it("renders inner wrapper div with correct classes", async () => {
    mockGetIsAdmin.mockResolvedValue(false);
    const layout = await MainLayout({ children: <div>content</div> });
    const { container } = render(layout);
    const inner = container.querySelector("main > div");
    expect(inner).toBeInTheDocument();
    expect(inner).toHaveClass("mx-auto", "h-full", "max-w-[1056px]", "pt-6");
  });

  it("renders children inside the inner wrapper", async () => {
    mockGetIsAdmin.mockResolvedValue(false);
    const layout = await MainLayout({
      children: <div data-testid="inner-child">inner</div>,
    });
    render(layout);
    const child = screen.getByTestId("inner-child");
    expect(child).toBeInTheDocument();
  });

  it("passes isAdmin=true to Sidebar when user is admin", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const layout = await MainLayout({ children: <div>content</div> });
    render(layout);
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toHaveAttribute("data-is-admin", "true");
  });

  it("passes isAdmin=false to Sidebar when user is not admin", async () => {
    mockGetIsAdmin.mockResolvedValue(false);
    const layout = await MainLayout({ children: <div>content</div> });
    render(layout);
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toHaveAttribute("data-is-admin", "false");
  });
});
