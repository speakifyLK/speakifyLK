import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { FeedWrapper } from "./feed-wrapper";

describe("FeedWrapper", () => {
  it("renders children", () => {
    render(
      <FeedWrapper>
        <span>Hello</span>
      </FeedWrapper>
    );

    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders a wrapper div with the correct className", () => {
    const { container } = render(
      <FeedWrapper>
        <span>Content</span>
      </FeedWrapper>
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.tagName).toBe("DIV");
    expect(wrapper.className).toContain("flex-1");
    expect(wrapper.className).toContain("pb-10");
  });
});
