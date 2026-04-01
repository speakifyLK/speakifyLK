import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Button, buttonVariants } from "./button";

describe("Button", () => {
  it("renders without error", () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole("button", { name: "Click me" })
    ).toBeInTheDocument();
  });

  it("renders children", () => {
    render(<Button>Hello</Button>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies default variant classes", () => {
    render(<Button>Default</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-white");
    expect(btn.className).toContain("text-slate-500");
  });

  it("merges custom className", () => {
    render(<Button className="my-custom-class">Styled</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("my-custom-class");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("passes through HTML button props", () => {
    render(
      <Button disabled data-testid="btn">
        Props
      </Button>
    );
    const btn = screen.getByTestId("btn");
    expect(btn).toBeDisabled();
  });

  // Variant tests
  const variants = [
    "default",
    "locked",
    "primary",
    "primaryOutline",
    "secondary",
    "secondaryOutline",
    "danger",
    "dangerOutline",
    "super",
    "superOutline",
    "ghost",
    "sidebar",
    "sidebarOutline",
  ] as const;

  variants.forEach((variant) => {
    it(`renders variant="${variant}" without error`, () => {
      render(<Button variant={variant}>{variant}</Button>);
      expect(screen.getByRole("button", { name: variant })).toBeInTheDocument();
    });
  });

  // Size tests
  const sizes = ["default", "sm", "lg", "icon", "rounded"] as const;

  sizes.forEach((size) => {
    it(`renders size="${size}" without error`, () => {
      render(<Button size={size}>{size}</Button>);
      expect(screen.getByRole("button", { name: size })).toBeInTheDocument();
    });
  });

  it("renders as child (asChild) using Slot", () => {
    render(
      <Button asChild>
        <a href="/link">Link</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: "Link" });
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe("A");
    // Should still get button variant classes
    expect(link.className).toContain("inline-flex");
  });

  it("buttonVariants returns a class string", () => {
    const cls = buttonVariants({ variant: "primary", size: "lg" });
    expect(typeof cls).toBe("string");
    expect(cls).toContain("bg-sky-400");
    expect(cls).toContain("h-12");
  });
});
