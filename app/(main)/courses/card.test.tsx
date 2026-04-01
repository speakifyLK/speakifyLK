import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
  Check: (props: any) => <div data-testid="check-icon" {...props} />,
}));

import { Card } from "./card";

describe("Card", () => {
  const defaultProps = {
    title: "Sinhala",
    id: 1,
    imageSrc: "/sinhala.svg",
    onClick: vi.fn(),
  };

  it("renders title and image", () => {
    render(<Card {...defaultProps} />);
    expect(screen.getByText("Sinhala")).toBeInTheDocument();
    const img = screen.getByAltText("Sinhala");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/sinhala.svg");
  });

  it("calls onClick with id when clicked", () => {
    const onClick = vi.fn();
    render(<Card {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByText("Sinhala"));
    expect(onClick).toHaveBeenCalledWith(1);
  });

  it("applies disabled styles when disabled", () => {
    const { container } = render(<Card {...defaultProps} disabled />);
    const card = container.firstElementChild;
    expect(card?.className).toContain("pointer-events-none");
    expect(card?.className).toContain("opacity-50");
  });

  it("does not show check icon when not active", () => {
    render(<Card {...defaultProps} />);
    expect(screen.queryByTestId("check-icon")).not.toBeInTheDocument();
  });

  it("shows check icon when active", () => {
    render(<Card {...defaultProps} isActive />);
    expect(screen.getByTestId("check-icon")).toBeInTheDocument();
  });

  it("does not apply disabled styles when not disabled", () => {
    const { container } = render(<Card {...defaultProps} />);
    const card = container.firstElementChild;
    expect(card?.className).not.toContain("pointer-events-none");
    expect(card?.className).not.toContain("opacity-50");
  });
});
