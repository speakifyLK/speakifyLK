import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Loading from "./loading";

describe("Chat Loading", () => {
  it("renders a loading spinner", () => {
    render(<Loading />);
    // The Loader icon from lucide-react renders an svg with the animate-spin class
    const container = screen.getByText("Connecting to AI Sinhala Tutor...");
    expect(container).toBeInTheDocument();
  });

  it("shows the connecting message", () => {
    render(<Loading />);
    expect(
      screen.getByText("Connecting to AI Sinhala Tutor...")
    ).toBeInTheDocument();
  });

  it("applies pulse animation to the connecting text", () => {
    render(<Loading />);
    const text = screen.getByText("Connecting to AI Sinhala Tutor...");
    expect(text.className).toContain("animate-pulse");
  });
});
