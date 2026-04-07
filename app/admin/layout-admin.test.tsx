import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({
  ClerkLoading: ({ children }: any) => (
    <div data-testid="clerk-loading">{children}</div>
  ),
  ClerkLoaded: ({ children }: any) => (
    <div data-testid="clerk-loaded">{children}</div>
  ),
  UserButton: (props: any) => (
    <div
      data-testid="user-button"
      data-after-sign-out-url={props.afterSignOutUrl}
    />
  ),
}));

vi.mock("react-admin", () => ({
  Layout: ({ children, menu: MenuComponent }: any) => (
    <div data-testid="ra-layout">
      {MenuComponent && <MenuComponent />}
      {children}
    </div>
  ),
  Menu: ({ className }: any) => (
    <div data-testid="ra-menu" className={className} />
  ),
}));

import { AdminLayout } from "./layout-admin";

describe("AdminLayout", () => {
  it("renders react-admin Layout", () => {
    render(<AdminLayout>content</AdminLayout>);
    expect(screen.getByTestId("ra-layout")).toBeInTheDocument();
  });

  it("passes children through to Layout", () => {
    render(<AdminLayout>admin content</AdminLayout>);
    expect(screen.getByText("admin content")).toBeInTheDocument();
  });

  it("renders the default Menu inside custom menu", () => {
    render(<AdminLayout>content</AdminLayout>);
    expect(screen.getByTestId("ra-menu")).toBeInTheDocument();
  });

  it("renders ClerkLoading with a loader spinner", () => {
    render(<AdminLayout>content</AdminLayout>);
    const loading = screen.getByTestId("clerk-loading");
    expect(loading).toBeInTheDocument();
    expect(screen.getByTestId("clerk-loader")).toBeInTheDocument();
  });

  it("renders ClerkLoaded with UserButton", () => {
    render(<AdminLayout>content</AdminLayout>);
    expect(screen.getByTestId("clerk-loaded")).toBeInTheDocument();
    const userButton = screen.getByTestId("user-button");
    expect(userButton).toBeInTheDocument();
    expect(userButton).toHaveAttribute("data-after-sign-out-url", "/");
  });
});
