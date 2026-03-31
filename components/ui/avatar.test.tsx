import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";

describe("Avatar", () => {
  it("renders without error", () => {
    render(<Avatar data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toBeInTheDocument();
  });

  it("applies default classes", () => {
    render(<Avatar data-testid="avatar" />);
    const el = screen.getByTestId("avatar");
    expect(el.className).toContain("rounded-full");
    expect(el.className).toContain("overflow-hidden");
  });

  it("merges custom className", () => {
    render(<Avatar data-testid="avatar" className="custom-cls" />);
    expect(screen.getByTestId("avatar").className).toContain("custom-cls");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Avatar ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it("renders children", () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("JD")).toBeInTheDocument();
  });
});

describe("AvatarImage", () => {
  // Radix AvatarImage uses an internal load-check and only renders the <img>
  // once the image has loaded — which never happens in jsdom.  We test that the
  // component mounts without error and that it renders inside the Avatar span.

  it("renders inside Avatar without error", () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="/photo.jpg" alt="User photo" />
      </Avatar>
    );
    expect(container.querySelector("span")).toBeInTheDocument();
  });

  it("accepts className prop without error", () => {
    expect(() =>
      render(
        <Avatar>
          <AvatarImage src="/photo.jpg" alt="User" className="extra-img" />
        </Avatar>
      )
    ).not.toThrow();
  });

  it("accepts a ref without error", () => {
    const ref = createRef<HTMLImageElement>();
    expect(() =>
      render(
        <Avatar>
          <AvatarImage ref={ref} src="/photo.jpg" alt="User" />
        </Avatar>
      )
    ).not.toThrow();
  });
});

describe("AvatarFallback", () => {
  it("renders fallback text", () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it("applies default classes", () => {
    render(
      <Avatar>
        <AvatarFallback data-testid="fb">AB</AvatarFallback>
      </Avatar>
    );
    const fb = screen.getByTestId("fb");
    expect(fb.className).toContain("items-center");
    expect(fb.className).toContain("justify-center");
  });

  it("merges custom className", () => {
    render(
      <Avatar>
        <AvatarFallback data-testid="fb" className="my-fb">
          AB
        </AvatarFallback>
      </Avatar>
    );
    expect(screen.getByTestId("fb").className).toContain("my-fb");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <Avatar>
        <AvatarFallback ref={ref}>AB</AvatarFallback>
      </Avatar>
    );
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});
