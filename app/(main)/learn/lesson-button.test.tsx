import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a
      href={href}
      {...props}
      style={{
        ...props.style,
        pointerEvents: props["aria-disabled"] ? "none" : "auto",
      }}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
  Check: (props: any) => <div data-testid="check-icon" {...props} />,
  Crown: (props: any) => <div data-testid="crown-icon" {...props} />,
  Star: (props: any) => <div data-testid="star-icon" {...props} />,
}));

vi.mock("react-circular-progressbar", () => ({
  CircularProgressbarWithChildren: ({ children, value }: any) => (
    <div data-testid="circular-progress" data-value={value}>
      {children}
    </div>
  ),
}));

import { LessonButton } from "./lesson-button";

describe("LessonButton", () => {
  const baseProps = {
    id: 1,
    index: 0,
    totalCount: 5,
    percentage: 50,
  };

  it("renders current lesson with Start label and progress bar", () => {
    render(<LessonButton {...baseProps} current />);
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByTestId("circular-progress")).toBeInTheDocument();
    expect(screen.getByTestId("circular-progress")).toHaveAttribute(
      "data-value",
      "50"
    );
  });

  it("renders Star icon for non-completed, non-last lesson", () => {
    render(<LessonButton {...baseProps} locked />);
    expect(screen.getByTestId("star-icon")).toBeInTheDocument();
  });

  it("renders Check icon for completed lesson", () => {
    // completed: !current && !locked
    render(<LessonButton {...baseProps} />);
    expect(screen.getByTestId("check-icon")).toBeInTheDocument();
  });

  it("renders Crown icon for last lesson", () => {
    // isLast: index === totalCount
    render(<LessonButton {...baseProps} index={5} locked />);
    expect(screen.getByTestId("crown-icon")).toBeInTheDocument();
  });

  it("links to /lesson/{id} for completed lesson", () => {
    render(<LessonButton {...baseProps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/lesson/1");
  });

  it("links to /lesson for non-completed lesson", () => {
    render(<LessonButton {...baseProps} current />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/lesson");
  });

  it("disables pointer events when locked", () => {
    render(<LessonButton {...baseProps} locked />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("aria-disabled", "true");
  });

  it("renders current + locked lesson with locked variant", () => {
    render(<LessonButton {...baseProps} current locked />);
    // The button inside the progress bar should have the "locked" variant prop
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("variant", "locked");
    // Icon should have neutral fill classes (locked branch)
    const icon = screen.getByTestId("star-icon");
    expect(icon.className).toContain("fill-neutral-400");
  });

  it("handles NaN percentage by passing 0", () => {
    render(<LessonButton {...baseProps} current percentage={NaN} />);
    expect(screen.getByTestId("circular-progress")).toHaveAttribute(
      "data-value",
      "0"
    );
  });

  it("renders non-current, non-completed (locked) without progress bar", () => {
    render(<LessonButton {...baseProps} locked />);
    expect(screen.queryByTestId("circular-progress")).not.toBeInTheDocument();
    expect(screen.queryByText("Start")).not.toBeInTheDocument();
  });

  it("applies correct margin-top for first non-completed lesson", () => {
    const { container } = render(<LessonButton {...baseProps} current />);
    const relativeDiv = container.querySelector(".relative");
    expect(relativeDiv).toHaveStyle({ marginTop: "60px" });
  });

  it("applies correct margin-top for non-first lesson", () => {
    const { container } = render(
      <LessonButton {...baseProps} index={1} current />
    );
    const relativeDiv = container.querySelector(".relative");
    expect(relativeDiv).toHaveStyle({ marginTop: "24px" });
  });

  it("calculates indentation for cycleIndex > 6 (index=7)", () => {
    // cycleIndex = 7 % 8 = 7, indentationLevel = 7 - 8 = -1, rightPosition = -40
    const { container } = render(
      <LessonButton {...baseProps} index={7} locked />
    );
    const relativeDiv = container.querySelector(".relative");
    expect(relativeDiv).toHaveStyle({ right: "-40px" });
  });

  it("calculates indentation for cycleIndex 3-4 (index=3)", () => {
    // cycleIndex = 3, indentationLevel = 4 - 3 = 1, rightPosition = 40
    const { container } = render(
      <LessonButton {...baseProps} index={3} locked />
    );
    const relativeDiv = container.querySelector(".relative");
    expect(relativeDiv).toHaveStyle({ right: "40px" });
  });

  it("calculates indentation for cycleIndex 5-6 (index=5)", () => {
    // cycleIndex = 5, indentationLevel = 4 - 5 = -1, rightPosition = -40
    const { container } = render(
      <LessonButton {...baseProps} index={5} locked />
    );
    const relativeDiv = container.querySelector(".relative");
    expect(relativeDiv).toHaveStyle({ right: "-40px" });
  });
});
