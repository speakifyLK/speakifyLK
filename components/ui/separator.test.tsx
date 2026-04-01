import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Separator } from "./separator";

describe("Separator", () => {
  it("renders without error", () => {
    render(<Separator data-testid="sep" />);
    expect(screen.getByTestId("sep")).toBeInTheDocument();
  });

  it("applies horizontal classes by default", () => {
    render(<Separator data-testid="sep" />);
    const el = screen.getByTestId("sep");
    expect(el.className).toContain("h-[1px]");
    expect(el.className).toContain("w-full");
  });

  it("applies vertical classes", () => {
    render(<Separator data-testid="sep" orientation="vertical" />);
    const el = screen.getByTestId("sep");
    expect(el.className).toContain("h-full");
    expect(el.className).toContain("w-[1px]");
  });

  it("applies shared classes", () => {
    render(<Separator data-testid="sep" />);
    const el = screen.getByTestId("sep");
    expect(el.className).toContain("shrink-0");
    expect(el.className).toContain("bg-border");
  });

  it("merges custom className", () => {
    render(<Separator data-testid="sep" className="my-sep" />);
    expect(screen.getByTestId("sep").className).toContain("my-sep");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Separator ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("is decorative by default (role=none)", () => {
    render(<Separator data-testid="sep" />);
    const el = screen.getByTestId("sep");
    expect(el.getAttribute("role")).toBe("none");
  });

  it("uses separator role when not decorative", () => {
    render(<Separator data-testid="sep" decorative={false} />);
    const el = screen.getByTestId("sep");
    expect(el.getAttribute("role")).toBe("separator");
  });

  it("sets data-orientation attribute", () => {
    render(<Separator data-testid="sep" orientation="vertical" />);
    expect(screen.getByTestId("sep").getAttribute("data-orientation")).toBe("vertical");
  });
});
