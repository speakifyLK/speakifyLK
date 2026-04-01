import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("lucide-react", () => ({
  NotebookText: (props: any) => <div data-testid="notebook-icon" {...props} />,
}));

import { UnitBanner } from "./unit-banner";

describe("UnitBanner", () => {
  it("renders title and description", () => {
    render(<UnitBanner title="Unit 1" description="Learn the basics" />);
    expect(screen.getByText("Unit 1")).toBeInTheDocument();
    expect(screen.getByText("Learn the basics")).toBeInTheDocument();
  });

  it("renders a link to /lesson", () => {
    render(<UnitBanner title="Unit 1" description="Basics" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/lesson");
  });

  it("renders Continue button", () => {
    render(<UnitBanner title="Unit 1" description="Basics" />);
    expect(screen.getByText("Continue")).toBeInTheDocument();
  });

  it("renders the NotebookText icon", () => {
    render(<UnitBanner title="Unit 1" description="Basics" />);
    expect(screen.getByTestId("notebook-icon")).toBeInTheDocument();
  });

  it("has green background", () => {
    const { container } = render(<UnitBanner title="Unit 1" description="Basics" />);
    const banner = container.firstElementChild;
    expect(banner).toHaveClass("bg-green-500");
  });
});
