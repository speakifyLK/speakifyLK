import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("react-admin", () => ({
  Edit: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="ra-edit">{children}</div>
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
  NumberInput: (props: { source: string; label?: string; validate?: unknown[] }) => (
    <input
      data-testid={`ra-number-input-${props.source}`}
      data-source={props.source}
      data-label={props.label}
      data-has-validate={props.validate ? "true" : "false"}
      type="number"
    />
  ),
  required: () => "required-validator",
}));

import { CourseEdit } from "./edit";

describe("CourseEdit", () => {
  it("renders an Edit wrapper", () => {
    render(<CourseEdit />);
    expect(screen.getByTestId("ra-edit")).toBeInTheDocument();
  });

  it("renders a SimpleForm inside Edit", () => {
    render(<CourseEdit />);
    expect(screen.getByTestId("ra-simple-form")).toBeInTheDocument();
  });

  it('renders a NumberInput for "id" with required validation', () => {
    render(<CourseEdit />);
    const input = screen.getByTestId("ra-number-input-id");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("data-source", "id");
    expect(input).toHaveAttribute("data-label", "Id");
    expect(input).toHaveAttribute("data-has-validate", "true");
  });

  it('renders a TextInput for "title" with required validation', () => {
    render(<CourseEdit />);
    const input = screen.getByTestId("ra-text-input-title");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("data-source", "title");
    expect(input).toHaveAttribute("data-label", "Title");
    expect(input).toHaveAttribute("data-has-validate", "true");
  });

  it('renders a TextInput for "imageSrc" with required validation', () => {
    render(<CourseEdit />);
    const input = screen.getByTestId("ra-text-input-imageSrc");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("data-source", "imageSrc");
    expect(input).toHaveAttribute("data-label", "Image");
    expect(input).toHaveAttribute("data-has-validate", "true");
  });
});
