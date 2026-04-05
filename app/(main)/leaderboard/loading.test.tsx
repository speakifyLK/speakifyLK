import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/loader", () => ({
  default: () => <div data-testid="custom-loader" className="loader" />,
}));

import Loading from "./loading";

describe("Leaderboard Loading", () => {
  it("renders without errors", () => {
    const { container } = render(<Loading />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders the custom loader", () => {
    render(<Loading />);
    const loader = screen.getByTestId("custom-loader");
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass("loader");
  });

  it("has a centered container", () => {
    const { container } = render(<Loading />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("flex", "h-full", "w-full", "items-center", "justify-center");
  });
});
