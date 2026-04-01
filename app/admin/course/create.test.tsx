import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock react-admin
vi.mock("react-admin", () => ({
  Create: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="ra-create">{children}</div>
  ),
  SimpleForm: ({ children }: { children: React.ReactNode }) => (
    <form data-testid="ra-simple-form">{children}</form>
  ),
  TextInput: (props: { source: string; label?: string; validate?: unknown[] }) => (
    <input
      data-testid={`ra-text-input-${props.source}`}
      data-source={props.source}
      data-label={props.label}
      data-has-validate={props.validate ? "true" : "false"}
    />
  ),
  required: () => "required-validator",
}));

import { CourseCreate } from "./create";

describe("CourseCreate", () => {
  it("renders a Create wrapper", () => {
    render(<CourseCreate />);
    expect(screen.getByTestId("ra-create")).toBeInTheDocument();
  });

  it("renders a SimpleForm inside Create", () => {
    render(<CourseCreate />);
    expect(screen.getByTestId("ra-simple-form")).toBeInTheDocument();
  });

  it('renders a TextInput for "title" with required validation', () => {
    render(<CourseCreate />);
    const input = screen.getByTestId("ra-text-input-title");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("data-source", "title");
    expect(input).toHaveAttribute("data-label", "Title");
    expect(input).toHaveAttribute("data-has-validate", "true");
  });

  it('renders a TextInput for "imageSrc" with required validation', () => {
    render(<CourseCreate />);
    const input = screen.getByTestId("ra-text-input-imageSrc");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("data-source", "imageSrc");
    expect(input).toHaveAttribute("data-label", "Image");
    expect(input).toHaveAttribute("data-has-validate", "true");
  });
});
