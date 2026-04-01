import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("lucide-react", () => ({
  Loader: (props: any) => <div data-testid="loader" {...props} />,
}));

import Loading from "./loading";

describe("AI Quiz Loading", () => {
  it("renders without errors", () => {
    const { container } = render(<Loading />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders the spinner", () => {
    render(<Loading />);
    const loader = screen.getByTestId("loader");
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass("h-6", "w-6", "animate-spin", "text-neutral-400");
  });

  it("renders sidebar skeleton placeholders", () => {
    const { container } = render(<Loading />);
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders main content skeleton", () => {
    const { container } = render(<Loading />);
    // Should have skeleton grid items
    const gridItems = container.querySelectorAll(".rounded-xl.border-2.border-b-4");
    expect(gridItems.length).toBeGreaterThan(0);
  });
});
