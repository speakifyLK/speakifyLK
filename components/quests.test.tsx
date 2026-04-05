import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value, className }: any) => (
    <div data-testid="progress" data-value={value} className={className} />
  ),
}));

import { Quests } from "./quests";

describe("Quests", () => {
  it("renders 'Quests' heading", () => {
    render(<Quests points={0} />);

    expect(screen.getByText("Quests")).toBeInTheDocument();
  });

  it("renders 'View all' button link", () => {
    render(<Quests points={0} />);

    const link = screen.getByText("View all");
    expect(link).toBeInTheDocument();
  });

  it("renders all quest items", () => {
    render(<Quests points={50} />);

    expect(screen.getByText("Earn 20 XP")).toBeInTheDocument();
    expect(screen.getByText("Earn 50 XP")).toBeInTheDocument();
    expect(screen.getByText("Earn 100 XP")).toBeInTheDocument();
    expect(screen.getByText("Earn 250 XP")).toBeInTheDocument();
    expect(screen.getByText("Earn 500 XP")).toBeInTheDocument();
    expect(screen.getByText("Earn 1000 XP")).toBeInTheDocument();
  });

  it("renders Points images for each quest", () => {
    render(<Quests points={0} />);

    const images = screen.getAllByAltText("Points");
    expect(images.length).toBe(6);
  });

  it("renders progress bars for each quest", () => {
    render(<Quests points={50} />);

    const progressBars = screen.getAllByTestId("progress");
    expect(progressBars.length).toBe(6);
  });

  it("calculates progress correctly", () => {
    render(<Quests points={50} />);

    const progressBars = screen.getAllByTestId("progress");
    // 50/20 * 100 = 250
    expect(progressBars[0]).toHaveAttribute("data-value", "250");
    // 50/50 * 100 = 100
    expect(progressBars[1]).toHaveAttribute("data-value", "100");
    // 50/100 * 100 = 50
    expect(progressBars[2]).toHaveAttribute("data-value", "50");
  });
});
