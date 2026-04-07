import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

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
  NumberInput: (props: { source: string; label?: string; validate?: unknown }) => (
    <input
      data-testid={`ra-number-input-${props.source}`}
      data-source={props.source}
      data-label={props.label}
      data-has-validate={props.validate ? "true" : "false"}
      type="number"
    />
  ),
  ReferenceInput: (props: { source: string; reference: string; perPage?: number; children?: React.ReactNode }) => (
    <div
      data-testid={`ra-reference-input-${props.source}`}
      data-source={props.source}
      data-reference={props.reference}
      data-per-page={props.perPage?.toString()}
    >
      {props.children}
    </div>
  ),
  AutocompleteInput: (props: { label?: string }) => (
    <input
      data-testid="ra-autocomplete-input"
      data-label={props.label}
    />
  ),
  required: () => "required-validator",
}));

import { UnitCreate } from "./create";

describe("UnitCreate", () => {
  it("renders a Create wrapper", () => {
    render(<UnitCreate />);
    expect(screen.getByTestId("ra-create")).toBeInTheDocument();
  });

  it("renders a SimpleForm inside Create", () => {
    render(<UnitCreate />);
    expect(screen.getByTestId("ra-simple-form")).toBeInTheDocument();
  });

  it('renders a TextInput for "title" with required validation', () => {
    render(<UnitCreate />);
    const input = screen.getByTestId("ra-text-input-title");
    expect(input).toHaveAttribute("data-source", "title");
    expect(input).toHaveAttribute("data-label", "Title");
    expect(input).toHaveAttribute("data-has-validate", "true");
  });

  it('renders a TextInput for "description" with required validation', () => {
    render(<UnitCreate />);
    const input = screen.getByTestId("ra-text-input-description");
    expect(input).toHaveAttribute("data-source", "description");
    expect(input).toHaveAttribute("data-label", "Description");
    expect(input).toHaveAttribute("data-has-validate", "true");
  });

  it('renders a ReferenceInput for "courseId" referencing "courses" with perPage=1000', () => {
    render(<UnitCreate />);
    const input = screen.getByTestId("ra-reference-input-courseId");
    expect(input).toHaveAttribute("data-source", "courseId");
    expect(input).toHaveAttribute("data-reference", "courses");
    expect(input).toHaveAttribute("data-per-page", "1000");
  });

  it('renders an AutocompleteInput inside the ReferenceInput', () => {
    render(<UnitCreate />);
    const autocomplete = screen.getByTestId("ra-autocomplete-input");
    expect(autocomplete).toHaveAttribute("data-label", "Course");
  });

  it('renders a NumberInput for "order" with required validation', () => {
    render(<UnitCreate />);
    const input = screen.getByTestId("ra-number-input-order");
    expect(input).toHaveAttribute("data-source", "order");
    expect(input).toHaveAttribute("data-label", "Order");
    expect(input).toHaveAttribute("data-has-validate", "true");
  });
});
