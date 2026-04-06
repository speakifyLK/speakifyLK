import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { Loader } from "./loader";

describe("Loader", () => {
  it("renders without errors", () => {
    const { container } = render(<Loader />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders with the speakify-loader class", () => {
    render(<Loader data-testid="loader" />);
    const loader = screen.getByTestId("loader");
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass("speakify-loader");
  });

  it("has role=status and aria-label for accessibility", () => {
    render(<Loader />);
    const loader = screen.getByRole("status");
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute("aria-label", "Loading");
  });

  it("merges additional classNames", () => {
    render(<Loader className="custom-class" data-testid="loader" />);
    const loader = screen.getByTestId("loader");
    expect(loader).toHaveClass("speakify-loader");
    expect(loader).toHaveClass("custom-class");
  });

  it("forwards additional HTML attributes", () => {
    render(<Loader id="my-loader" data-testid="loader" />);
    const loader = screen.getByTestId("loader");
    expect(loader).toHaveAttribute("id", "my-loader");
  });
});
