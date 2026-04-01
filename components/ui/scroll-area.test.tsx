import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { ScrollArea, ScrollBar } from "./scroll-area";

describe("ScrollArea", () => {
  it("renders without error", () => {
    render(<ScrollArea data-testid="scroll">Content</ScrollArea>);
    expect(screen.getByTestId("scroll")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(<ScrollArea>Hello World</ScrollArea>);
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("applies default classes", () => {
    render(<ScrollArea data-testid="scroll">X</ScrollArea>);
    const el = screen.getByTestId("scroll");
    expect(el.className).toContain("overflow-hidden");
    expect(el.className).toContain("relative");
  });

  it("merges custom className", () => {
    render(
      <ScrollArea data-testid="scroll" className="extra-scroll">
        X
      </ScrollArea>
    );
    expect(screen.getByTestId("scroll").className).toContain("extra-scroll");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ScrollArea ref={ref}>X</ScrollArea>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("renders an inner viewport div with data attribute", () => {
    render(<ScrollArea data-testid="scroll">X</ScrollArea>);
    const root = screen.getByTestId("scroll");
    const viewport = root.querySelector("[data-radix-scroll-area-viewport]");
    expect(viewport).toBeInTheDocument();
    expect(viewport!.className).toContain("overflow-auto");
  });

  it("passes through extra HTML props", () => {
    render(
      <ScrollArea data-testid="scroll" aria-label="scrollable" role="region">
        X
      </ScrollArea>
    );
    const el = screen.getByTestId("scroll");
    expect(el.getAttribute("aria-label")).toBe("scrollable");
    expect(el.getAttribute("role")).toBe("region");
  });
});

describe("ScrollBar", () => {
  it("renders without error", () => {
    render(<ScrollBar data-testid="scrollbar" />);
    expect(screen.getByTestId("scrollbar")).toBeInTheDocument();
  });

  it("applies hidden class by default", () => {
    render(<ScrollBar data-testid="scrollbar" />);
    expect(screen.getByTestId("scrollbar").className).toContain("hidden");
  });

  it("merges custom className", () => {
    render(<ScrollBar data-testid="scrollbar" className="my-bar" />);
    expect(screen.getByTestId("scrollbar").className).toContain("my-bar");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<ScrollBar ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
