import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentPropsWithoutRef } from "react";

vi.mock("@/components/loader", () => ({
  Loader: (props: ComponentPropsWithoutRef<"div">) => (
    <div data-testid="custom-loader" className="speakify-loader" {...props} />
  ),
}));

import Loading from "./loading";

describe("Chat Loading", () => {
  it("renders the custom loader", () => {
    render(<Loading />);
    const loader = screen.getByTestId("custom-loader");
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass("speakify-loader");
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
