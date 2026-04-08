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

  it("always renders Profile menu item", () => {
    render(<SidebarUserButton />);

    expect(screen.getByTestId("user-button-menu-items")).toBeInTheDocument();
    const links = screen.getAllByTestId("user-button-link");
    const profileLink = links.find((l) => l.getAttribute("data-label") === "Profile");
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute("href", "/profile");
  });

  it("does not render Admin menu item when isAdmin is false", () => {
    render(<SidebarUserButton isAdmin={false} />);

    const links = screen.getAllByTestId("user-button-link");
    const adminLink = links.find((l) => l.getAttribute("data-label") === "Admin");
    expect(adminLink).toBeUndefined();
  });

  it("does not render Admin menu item when isAdmin is undefined", () => {
    render(<SidebarUserButton />);

    const links = screen.getAllByTestId("user-button-link");
    const adminLink = links.find((l) => l.getAttribute("data-label") === "Admin");
    expect(adminLink).toBeUndefined();
  });

  it("renders Admin menu item inside UserButton when isAdmin is true", () => {
    render(<SidebarUserButton isAdmin={true} />);

    expect(screen.getByTestId("user-button-menu-items")).toBeInTheDocument();
    const links = screen.getAllByTestId("user-button-link");
    const adminLink = links.find((l) => l.getAttribute("data-label") === "Admin");
    expect(adminLink).toBeInTheDocument();
    expect(adminLink).toHaveAttribute("href", "/admin");
  });
});
