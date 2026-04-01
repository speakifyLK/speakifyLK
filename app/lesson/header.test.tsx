import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockOpen = vi.hoisted(() => vi.fn());

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value }: any) => (
    <div data-testid="progress-bar" data-value={value}>
      Progress: {value}%
    </div>
  ),
}));

vi.mock("@/store/use-exit-modal", () => ({
  useExitModal: () => ({ open: mockOpen }),
}));

import { Header } from "./header";

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the progress bar with percentage", () => {
    render(<Header hearts={5} percentage={50} hasActiveSubscription={false} />);
    const progress = screen.getByTestId("progress-bar");
    expect(progress).toHaveAttribute("data-value", "50");
  });

  it("renders hearts count when no subscription", () => {
    render(<Header hearts={3} percentage={0} hasActiveSubscription={false} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders heart image", () => {
    render(<Header hearts={5} percentage={0} hasActiveSubscription={false} />);
    const heartImg = screen.getByAltText("Heart");
    expect(heartImg).toHaveAttribute("src", "/heart.svg");
  });

  it("renders infinity icon when user has active subscription", () => {
    const { container } = render(<Header hearts={5} percentage={0} hasActiveSubscription={true} />);
    // Should NOT render the numeric heart count
    expect(screen.queryByText("5")).not.toBeInTheDocument();
    // Should have an SVG (InfinityIcon)
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it("calls open on exit modal when X is clicked", () => {
    const { container } = render(
      <Header hearts={5} percentage={0} hasActiveSubscription={false} />
    );
    // The X icon is an SVG rendered by lucide
    // It has an onClick handler
    const xIcon = container.querySelector("svg.cursor-pointer");
    expect(xIcon).toBeTruthy();
    fireEvent.click(xIcon!);
    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  it("renders 0 hearts", () => {
    render(<Header hearts={0} percentage={0} hasActiveSubscription={false} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders full progress bar at 100%", () => {
    render(<Header hearts={5} percentage={100} hasActiveSubscription={false} />);
    const progress = screen.getByTestId("progress-bar");
    expect(progress).toHaveAttribute("data-value", "100");
  });
});
