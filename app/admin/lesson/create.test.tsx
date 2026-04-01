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
  ReferenceInput: (props: { source: string; reference: string }) => (
    <select
      data-testid={`ra-reference-input-${props.source}`}
      data-source={props.source}
      data-reference={props.reference}
    />
  ),
  required: () => "required-validator",
}));

import { LessonCreate } from "./create";

describe("LessonCreate", () => {
  it("renders a Create wrapper", () => {
    render(<LessonCreate />);
    expect(screen.getByTestId("ra-create")).toBeInTheDocument();
  });

  it("renders a SimpleForm inside Create", () => {
    render(<LessonCreate />);
    expect(screen.getByTestId("ra-simple-form")).toBeInTheDocument();
  });

  it('renders a TextInput for "title" with required validation', () => {
    render(<LessonCreate />);
    const input = screen.getByTestId("ra-text-input-title");
    expect(input).toHaveAttribute("data-source", "title");
    expect(input).toHaveAttribute("data-label", "Title");
    expect(input).toHaveAttribute("data-has-validate", "true");
  });

  it('renders a ReferenceInput for "unitId" referencing "units"', () => {
    render(<LessonCreate />);
    const input = screen.getByTestId("ra-reference-input-unitId");
    expect(input).toHaveAttribute("data-source", "unitId");
    expect(input).toHaveAttribute("data-reference", "units");
  });

  it('renders a NumberInput for "order" with required validation', () => {
    render(<LessonCreate />);
    const input = screen.getByTestId("ra-number-input-order");
    expect(input).toHaveAttribute("data-source", "order");
    expect(input).toHaveAttribute("data-label", "Order");
    expect(input).toHaveAttribute("data-has-validate", "true");
  });
});
