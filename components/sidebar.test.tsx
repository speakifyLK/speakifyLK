import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/learn"),
}));

vi.mock("./sidebar-user-button", () => ({
  SidebarUserButton: ({ isAdmin }: { isAdmin?: boolean }) => (
    <div data-testid="sidebar-user-button" data-is-admin={String(!!isAdmin)} />
  ),
}));

import { Sidebar } from "./sidebar";

describe("Sidebar", () => {
  it("renders the Speakify brand name", () => {
    render(<Sidebar />);

    expect(screen.getByText("Speakify")).toBeInTheDocument();
  });

  it("renders mascot image", () => {
    render(<Sidebar />);

    const mascot = screen.getByAltText("Mascot");
    expect(mascot).toBeInTheDocument();
    expect(mascot).toHaveAttribute("src", "/mascot.svg");
  });

  it("renders all sidebar navigation items", () => {
    render(<Sidebar />);

    expect(screen.getByText("Learn")).toBeInTheDocument();
    expect(screen.getByText("Quiz")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Leaderboard")).toBeInTheDocument();
    expect(screen.getByText("Quests")).toBeInTheDocument();
    expect(screen.getByText("Shop")).toBeInTheDocument();
  });

  it("renders sidebar items in correct order", () => {
    render(<Sidebar />);

    const links = screen.getAllByRole("link");
    const navLabels = links.map((l) => l.textContent?.trim()).filter((t) => t && t !== "Speakify");
    expect(navLabels).toEqual(["Learn", "Quiz", "Chat", "Leaderboard", "Quests", "Shop"]);
  });

  it("renders SidebarUserButton", () => {
    render(<Sidebar />);

    expect(screen.getByTestId("sidebar-user-button")).toBeInTheDocument();
  });

  it("passes isAdmin=false to SidebarUserButton when isAdmin is false", () => {
    render(<Sidebar isAdmin={false} />);

    expect(screen.getByTestId("sidebar-user-button")).toHaveAttribute("data-is-admin", "false");
  });

  it("passes isAdmin=false to SidebarUserButton when isAdmin is undefined", () => {
    render(<Sidebar />);

    expect(screen.getByTestId("sidebar-user-button")).toHaveAttribute("data-is-admin", "false");
  });

  it("passes isAdmin=true to SidebarUserButton when isAdmin is true", () => {
    render(<Sidebar isAdmin={true} />);

    expect(screen.getByTestId("sidebar-user-button")).toHaveAttribute("data-is-admin", "true");
  });

  it("accepts and applies className prop", () => {
    const { container } = render(<Sidebar className="test-class" />);

    const sidebar = container.firstChild as HTMLElement;
    expect(sidebar.className).toContain("test-class");
  });

  it("renders link to /learn", () => {
    render(<Sidebar />);

    const links = screen.getAllByRole("link");
    const learnLink = links.find((l) => l.getAttribute("href") === "/learn");
    expect(learnLink).toBeDefined();
  });
});
