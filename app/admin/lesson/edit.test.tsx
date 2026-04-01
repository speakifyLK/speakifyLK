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
  NumberInput: (props: { source: string; label?: string; validate?: unknown }) => (
    <input
      data-testid={`ra-number-input-${props.source}`}
      data-source={props.source}
      data-label={props.label}
      data-has-validate={props.validate ? "true" : "false"}
      type="number"
    />
  ),
  ReferenceInput: (props: { source: string; reference: string }) => (
    <select
      data-testid={`ra-reference-input-${props.source}`}
      data-source={props.source}
      data-reference={props.reference}
    />
  ),
  required: () => "required-validator",
}));

import { LessonEdit } from "./edit";

describe("LessonEdit", () => {
  it("renders an Edit wrapper", () => {
    render(<LessonEdit />);
    expect(screen.getByTestId("ra-edit")).toBeInTheDocument();
  });

  it("renders a SimpleForm inside Edit", () => {
    render(<LessonEdit />);
    expect(screen.getByTestId("ra-simple-form")).toBeInTheDocument();
  });

  it('renders a NumberInput for "id" with required validation', () => {
    render(<LessonEdit />);
    const input = screen.getByTestId("ra-number-input-id");
    expect(input).toHaveAttribute("data-source", "id");
    expect(input).toHaveAttribute("data-label", "Id");
    expect(input).toHaveAttribute("data-has-validate", "true");
  });

  it('renders a TextInput for "title" with required validation', () => {
    render(<LessonEdit />);
    const input = screen.getByTestId("ra-text-input-title");
    expect(input).toHaveAttribute("data-source", "title");
    expect(input).toHaveAttribute("data-label", "Title");
    expect(input).toHaveAttribute("data-has-validate", "true");
  });

  it('renders a ReferenceInput for "unitId" referencing "units"', () => {
    render(<LessonEdit />);
    const input = screen.getByTestId("ra-reference-input-unitId");
    expect(input).toHaveAttribute("data-source", "unitId");
    expect(input).toHaveAttribute("data-reference", "units");
  });

  it('renders a NumberInput for "order" with required validation', () => {
    render(<LessonEdit />);
    const input = screen.getByTestId("ra-number-input-order");
    expect(input).toHaveAttribute("data-source", "order");
    expect(input).toHaveAttribute("data-label", "Order");
    expect(input).toHaveAttribute("data-has-validate", "true");
  });
});
