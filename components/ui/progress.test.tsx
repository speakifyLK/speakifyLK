import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Progress } from "./progress";

describe("Progress", () => {
  it("renders without error", () => {
    render(<Progress data-testid="progress" value={50} />);
    expect(screen.getByTestId("progress")).toBeInTheDocument();
  });

  it("applies default classes", () => {
    render(<Progress data-testid="progress" value={0} />);
    const el = screen.getByTestId("progress");
    expect(el.className).toContain("overflow-hidden");
    expect(el.className).toContain("rounded-full");
  });

  it("merges custom className", () => {
    render(<Progress data-testid="progress" className="my-prog" value={0} />);
    expect(screen.getByTestId("progress").className).toContain("my-prog");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Progress ref={ref} value={0} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("sets indicator translateX based on value", () => {
    render(<Progress data-testid="progress" value={70} />);
    const root = screen.getByTestId("progress");
    const indicator = root.firstChild as HTMLElement;
    expect(indicator.style.transform).toBe("translateX(-30%)");
  });

  it("handles value=0 correctly", () => {
    render(<Progress data-testid="progress" value={0} />);
    const root = screen.getByTestId("progress");
    const indicator = root.firstChild as HTMLElement;
    expect(indicator.style.transform).toBe("translateX(-100%)");
  });

  it("handles value=100 correctly", () => {
    render(<Progress data-testid="progress" value={100} />);
    const root = screen.getByTestId("progress");
    const indicator = root.firstChild as HTMLElement;
    expect(indicator.style.transform).toBe("translateX(-0%)");
  });

  it("handles undefined value (defaults to 0)", () => {
    render(<Progress data-testid="progress" />);
    const root = screen.getByTestId("progress");
    const indicator = root.firstChild as HTMLElement;
    expect(indicator.style.transform).toBe("translateX(-100%)");
  });

  it("indicator has green background class", () => {
    render(<Progress data-testid="progress" value={50} />);
    const root = screen.getByTestId("progress");
    const indicator = root.firstChild as HTMLElement;
    expect(indicator.className).toContain("bg-green-500");
  });
});
