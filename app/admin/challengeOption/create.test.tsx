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
  BooleanInput: (props: { source: string; label?: string }) => (
    <input
      data-testid={`ra-boolean-input-${props.source}`}
      data-source={props.source}
      data-label={props.label}
      type="checkbox"
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

import { ChallengeOptionCreate } from "./create";

describe("ChallengeOptionCreate", () => {
  it("renders a Create wrapper", () => {
    render(<ChallengeOptionCreate />);
    expect(screen.getByTestId("ra-create")).toBeInTheDocument();
  });

  it("renders a SimpleForm inside Create", () => {
    render(<ChallengeOptionCreate />);
    expect(screen.getByTestId("ra-simple-form")).toBeInTheDocument();
  });

  it('renders a TextInput for "text" with required validation', () => {
    render(<ChallengeOptionCreate />);
    const input = screen.getByTestId("ra-text-input-text");
    expect(input).toHaveAttribute("data-source", "text");
    expect(input).toHaveAttribute("data-label", "Text");
    expect(input).toHaveAttribute("data-has-validate", "true");
  });

  it('renders a BooleanInput for "correct"', () => {
    render(<ChallengeOptionCreate />);
    const input = screen.getByTestId("ra-boolean-input-correct");
    expect(input).toHaveAttribute("data-source", "correct");
    expect(input).toHaveAttribute("data-label", "Correct option");
  });

  it('renders a ReferenceInput for "challengeId" referencing "challenges" with perPage=1000', () => {
    render(<ChallengeOptionCreate />);
    const input = screen.getByTestId("ra-reference-input-challengeId");
    expect(input).toHaveAttribute("data-source", "challengeId");
    expect(input).toHaveAttribute("data-reference", "challenges");
    expect(input).toHaveAttribute("data-per-page", "1000");
  });

  it('renders an AutocompleteInput inside the ReferenceInput', () => {
    render(<ChallengeOptionCreate />);
    const autocomplete = screen.getByTestId("ra-autocomplete-input");
    expect(autocomplete).toHaveAttribute("data-label", "Challenge");
  });

  it('renders a TextInput for "imageSrc" without required validation', () => {
    render(<ChallengeOptionCreate />);
    const input = screen.getByTestId("ra-text-input-imageSrc");
    expect(input).toHaveAttribute("data-source", "imageSrc");
    expect(input).toHaveAttribute("data-label", "Image URL");
    expect(input).toHaveAttribute("data-has-validate", "false");
  });

  it('renders a TextInput for "audioSrc" without required validation', () => {
    render(<ChallengeOptionCreate />);
    const input = screen.getByTestId("ra-text-input-audioSrc");
    expect(input).toHaveAttribute("data-source", "audioSrc");
    expect(input).toHaveAttribute("data-label", "Audio URL");
    expect(input).toHaveAttribute("data-has-validate", "false");
  });
});
