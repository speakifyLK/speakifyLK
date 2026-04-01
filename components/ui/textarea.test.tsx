import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("renders without error", () => {
    render(<Textarea data-testid="ta" />);
    expect(screen.getByTestId("ta")).toBeInTheDocument();
  });

  it("renders as a textarea element", () => {
    render(<Textarea data-testid="ta" />);
    expect(screen.getByTestId("ta").tagName).toBe("TEXTAREA");
  });

  it("applies default classes", () => {
    render(<Textarea data-testid="ta" />);
    const el = screen.getByTestId("ta");
    expect(el.className).toContain("min-h-[80px]");
    expect(el.className).toContain("rounded-md");
    expect(el.className).toContain("border");
  });

  it("merges custom className", () => {
    render(<Textarea data-testid="ta" className="my-textarea" />);
    expect(screen.getByTestId("ta").className).toContain("my-textarea");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("passes through HTML textarea props", () => {
    render(<Textarea data-testid="ta" placeholder="Type here" disabled rows={5} />);
    const el = screen.getByTestId("ta") as HTMLTextAreaElement;
    expect(el.placeholder).toBe("Type here");
    expect(el).toBeDisabled();
    expect(el.rows).toBe(5);
  });

  it("handles user input", async () => {
    const user = userEvent.setup();
    render(<Textarea data-testid="ta" />);
    const el = screen.getByTestId("ta");
    await user.type(el, "Hello World");
    expect(el).toHaveValue("Hello World");
  });
});
