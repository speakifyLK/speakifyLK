import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { StickyWrapper } from "./sticky-wrapper";

describe("StickyWrapper", () => {
  it("renders children", () => {
    render(
      <StickyWrapper>
        <span>Sticky content</span>
      </StickyWrapper>
    );

    expect(screen.getByText("Sticky content")).toBeInTheDocument();
  });

  it("renders outer div with correct className", () => {
    const { container } = render(
      <StickyWrapper>
        <span>Test</span>
      </StickyWrapper>
    );

    const outer = container.firstChild as HTMLElement;
    expect(outer.tagName).toBe("DIV");
    expect(outer.className).toContain("sticky");
    expect(outer.className).toContain("w-[368px]");
  });

  it("renders inner sticky div", () => {
    const { container } = render(
      <StickyWrapper>
        <span>Inner</span>
      </StickyWrapper>
    );

    const inner = (container.firstChild as HTMLElement)
      .firstChild as HTMLElement;
    expect(inner.className).toContain("sticky");
    expect(inner.className).toContain("top-6");
    expect(inner.className).toContain("flex-col");
  });
});
