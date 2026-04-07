import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@clerk/nextjs", () => {
  const MockUserButton = Object.assign(
    ({ children, ..._props }: any) => (
      <div data-testid="user-button">{children}</div>
    ),
    {
      MenuItems: ({ children }: any) => (
        <div data-testid="user-button-menu-items">{children}</div>
      ),
      Link: (props: any) => (
        <a
          data-testid="user-button-link"
          href={props.href}
          data-label={props.label}
        />
      ),
    }
  );

  return {
    ClerkLoading: ({ children }: any) => (
      <div data-testid="clerk-loading">{children}</div>
    ),
    ClerkLoaded: ({ children }: any) => (
      <div data-testid="clerk-loaded">{children}</div>
    ),
    UserButton: MockUserButton,
  };
});

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
    expect(screen.getByTestId("user-button")).toBeInTheDocument();
  });

  it("renders Back to App link inside UserButton menu", () => {
    render(<AdminLayout>content</AdminLayout>);
    expect(screen.getByTestId("user-button-menu-items")).toBeInTheDocument();
    const link = screen.getByTestId("user-button-link");
    expect(link).toHaveAttribute("href", "/learn");
    expect(link).toHaveAttribute("data-label", "Back to App");
  });
});
