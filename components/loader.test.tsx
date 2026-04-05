import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import Loader from "./loader";

describe("Loader", () => {
  it("renders without errors", () => {
    const { container } = render(<Loader />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders with the loader class", () => {
    render(<Loader />);
    const loader = screen.getByTestId("custom-loader");
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass("loader");
  });
});
