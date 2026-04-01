import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LessonLayout from "./layout";

describe("LessonLayout", () => {
  it("renders children", () => {
    render(
      <LessonLayout>
        <div data-testid="child">Hello</div>
      </LessonLayout>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies flex layout classes", () => {
    const { container } = render(
      <LessonLayout>
        <span>Content</span>
      </LessonLayout>
    );
    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv.className).toContain("flex");
    expect(outerDiv.className).toContain("h-full");
    expect(outerDiv.className).toContain("flex-col");
  });
});
