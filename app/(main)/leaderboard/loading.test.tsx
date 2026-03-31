import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("lucide-react", () => ({
  Loader: (props: any) => <div data-testid="loader" {...props} />,
}));

import Loading from "./loading";

describe("Leaderboard Loading", () => {
  it("renders without errors", () => {
    const { container } = render(<Loading />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders the spinner with correct classes", () => {
    render(<Loading />);
    const loader = screen.getByTestId("loader");
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass(
      "h-6",
      "w-6",
      "animate-spin",
      "text-muted-foreground"
    );
  });

  it("has a centered container", () => {
    const { container } = render(<Loading />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass(
      "flex",
      "h-full",
      "w-full",
      "items-center",
      "justify-center"
    );
  });
});
