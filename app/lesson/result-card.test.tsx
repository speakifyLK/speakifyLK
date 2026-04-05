import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

import { ResultCard } from "./result-card";

describe("ResultCard", () => {
  it("renders points variant with correct label", () => {
    render(<ResultCard variant="points" value={50} />);
    expect(screen.getByText("Total XP")).toBeInTheDocument();
  });

  it("renders hearts variant with correct label", () => {
    render(<ResultCard variant="hearts" value={3} />);
    expect(screen.getByText("Hears Left")).toBeInTheDocument();
  });

  it("renders the numeric value for points", () => {
    render(<ResultCard variant="points" value={100} />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders the numeric value for hearts", () => {
    render(<ResultCard variant="hearts" value={4} />);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders infinity icon when value is Infinity", () => {
    const { container } = render(<ResultCard variant="hearts" value={Infinity} />);
    // InfinityIcon from lucide-react renders an SVG
    // The numeric value should NOT be displayed
    expect(screen.queryByText("Infinity")).not.toBeInTheDocument();
    // Should have an SVG (the infinity icon)
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it("renders points image", () => {
    render(<ResultCard variant="points" value={50} />);
    const img = screen.getByAltText("points");
    expect(img).toHaveAttribute("src", "/points.svg");
  });

  it("renders hearts image", () => {
    render(<ResultCard variant="hearts" value={3} />);
    const img = screen.getByAltText("hearts");
    expect(img).toHaveAttribute("src", "/heart.svg");
  });

  it("applies orange styles for points variant", () => {
    const { container } = render(<ResultCard variant="points" value={50} />);
    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv.className).toContain("border-orange-400");
  });

  it("applies rose styles for hearts variant", () => {
    const { container } = render(<ResultCard variant="hearts" value={3} />);
    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv.className).toContain("border-rose-500");
  });
});
