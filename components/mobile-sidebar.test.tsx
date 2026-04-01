import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: any) => <div data-testid="sheet">{children}</div>,
  SheetContent: ({ children }: any) => <div data-testid="sheet-content">{children}</div>,
  SheetTrigger: ({ children }: any) => <div data-testid="sheet-trigger">{children}</div>,
}));

vi.mock("./sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

import { MobileSidebar } from "./mobile-sidebar";

describe("MobileSidebar", () => {
  it("renders Sheet component", () => {
    render(<MobileSidebar />);

    expect(screen.getByTestId("sheet")).toBeInTheDocument();
  });

  it("renders SheetTrigger", () => {
    render(<MobileSidebar />);

    expect(screen.getByTestId("sheet-trigger")).toBeInTheDocument();
  });

  it("renders SheetContent with Sidebar inside", () => {
    render(<MobileSidebar />);

    expect(screen.getByTestId("sheet-content")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });
});
