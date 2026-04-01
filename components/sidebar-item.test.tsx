import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUsePathname = vi.fn(() => "/learn");

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

import { SidebarItem } from "./sidebar-item";

describe("SidebarItem", () => {
  it("renders label text", () => {
    render(<SidebarItem label="Learn" iconSrc="/learn.svg" href="/learn" />);

    expect(screen.getByText("Learn")).toBeInTheDocument();
  });

  it("renders icon image when iconSrc is provided", () => {
    render(<SidebarItem label="Learn" iconSrc="/learn.svg" href="/learn" />);

    const img = screen.getByAltText("Learn");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/learn.svg");
  });

  it("renders a link with correct href", () => {
    render(<SidebarItem label="Learn" iconSrc="/learn.svg" href="/learn" />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/learn");
  });

  it("renders icon node when icon prop is provided instead of iconSrc", () => {
    render(
      <SidebarItem label="Chat" icon={<span data-testid="lucide-icon">icon</span>} href="/chat" />
    );

    expect(screen.getByTestId("lucide-icon")).toBeInTheDocument();
  });

  it("uses sidebarOutline variant when active", () => {
    mockUsePathname.mockReturnValue("/learn");

    const { container } = render(<SidebarItem label="Learn" iconSrc="/learn.svg" href="/learn" />);

    const link = container.querySelector("a");
    expect(link?.className).toContain("bg-sky-500/15");
  });

  it("uses sidebar variant when inactive", () => {
    mockUsePathname.mockReturnValue("/other");

    const { container } = render(<SidebarItem label="Learn" iconSrc="/learn.svg" href="/learn" />);

    const link = container.querySelector("a");
    expect(link?.className).not.toContain("bg-sky-500/15");
  });
});
