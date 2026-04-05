import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/loader", () => ({
  default: () => <div data-testid="custom-loader" className="loader" />,
}));

import Loading from "./loading";

describe("Chat Loading", () => {
  it("renders the custom loader", () => {
    render(<Loading />);
    const loader = screen.getByTestId("custom-loader");
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass("loader");
  });

  it("shows the connecting message", () => {
    render(<Loading />);
    expect(screen.getByText("Connecting to AI Sinhala Tutor...")).toBeInTheDocument();
  });

  it("applies pulse animation to the connecting text", () => {
    render(<Loading />);
    const text = screen.getByText("Connecting to AI Sinhala Tutor...");
    expect(text.className).toContain("animate-pulse");
  });
});
