import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@clerk/nextjs", () => {
  const MockUserButton = Object.assign(
    ({ children, ..._props }: any) => <div data-testid="user-button">{children}</div>,
    {
      MenuItems: ({ children }: any) => <div data-testid="user-button-menu-items">{children}</div>,
      Link: (props: any) => (
        <a data-testid="user-button-link" href={props.href} data-label={props.label} />
      ),
    }
  );

  return {
    ClerkLoading: ({ children: _children }: any) => null,
    ClerkLoaded: ({ children }: any) => <>{children}</>,
    UserButton: MockUserButton,
  };
});

import { SidebarUserButton } from "./sidebar-user-button";

describe("SidebarUserButton", () => {
  it("renders UserButton when clerk is loaded", () => {
    render(<SidebarUserButton />);

    expect(screen.getByTestId("user-button")).toBeInTheDocument();
  });

  it("does not render Admin menu item when isAdmin is false", () => {
    render(<SidebarUserButton isAdmin={false} />);

    expect(screen.queryByTestId("user-button-menu-items")).not.toBeInTheDocument();
  });

  it("does not render Admin menu item when isAdmin is undefined", () => {
    render(<SidebarUserButton />);

    expect(screen.queryByTestId("user-button-menu-items")).not.toBeInTheDocument();
  });

  it("renders Admin menu item inside UserButton when isAdmin is true", () => {
    render(<SidebarUserButton isAdmin={true} />);

    expect(screen.getByTestId("user-button-menu-items")).toBeInTheDocument();
    const link = screen.getByTestId("user-button-link");
    expect(link).toHaveAttribute("href", "/admin");
    expect(link).toHaveAttribute("data-label", "Admin");
  });
});
