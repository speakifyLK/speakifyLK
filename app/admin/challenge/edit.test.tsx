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
  SelectInput: (props: {
    source: string;
    validate?: unknown[];
    choices?: { id: string; name: string }[];
  }) => (
    <select
      data-testid={`ra-select-input-${props.source}`}
      data-source={props.source}
      data-has-validate={props.validate ? "true" : "false"}
      data-choices={JSON.stringify(props.choices)}
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

import { ChallengeEdit } from "./edit";

describe("ChallengeEdit", () => {
  it("renders an Edit wrapper", () => {
    render(<ChallengeEdit />);
    expect(screen.getByTestId("ra-edit")).toBeInTheDocument();
  });

  it("renders a SimpleForm inside Edit", () => {
    render(<ChallengeEdit />);
    expect(screen.getByTestId("ra-simple-form")).toBeInTheDocument();
  });

  it('renders a TextInput for "question" with required validation', () => {
    render(<ChallengeEdit />);
    const input = screen.getByTestId("ra-text-input-question");
    expect(input).toHaveAttribute("data-source", "question");
    expect(input).toHaveAttribute("data-label", "Question");
    expect(input).toHaveAttribute("data-has-validate", "true");
  });

  it('renders a SelectInput for "type" with SELECT and ASSIST choices', () => {
    render(<ChallengeEdit />);
    const input = screen.getByTestId("ra-select-input-type");
    expect(input).toHaveAttribute("data-source", "type");
    expect(input).toHaveAttribute("data-has-validate", "true");
    const choices = JSON.parse(input.getAttribute("data-choices")!);
    expect(choices).toEqual([
      { id: "SELECT", name: "SELECT" },
      { id: "ASSIST", name: "ASSIST" },
    ]);
  });

  it('renders a ReferenceInput for "lessonId" referencing "lessons"', () => {
    render(<ChallengeEdit />);
    const input = screen.getByTestId("ra-reference-input-lessonId");
    expect(input).toHaveAttribute("data-source", "lessonId");
    expect(input).toHaveAttribute("data-reference", "lessons");
  });

  it('renders a NumberInput for "order" with required validation', () => {
    render(<ChallengeEdit />);
    const input = screen.getByTestId("ra-number-input-order");
    expect(input).toHaveAttribute("data-source", "order");
    expect(input).toHaveAttribute("data-label", "Order");
    expect(input).toHaveAttribute("data-has-validate", "true");
  });
});
