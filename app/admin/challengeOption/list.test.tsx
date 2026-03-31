import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("react-admin", () => ({
  List: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="ra-list">{children}</div>
  ),
  Datagrid: ({
    children,
    rowClick,
  }: {
    children: React.ReactNode;
    rowClick?: string;
  }) => (
    <table data-testid="ra-datagrid" data-row-click={rowClick}>
      <tbody>{children}</tbody>
    </table>
  ),
  NumberField: (props: { source: string }) => (
    <span
      data-testid={`ra-number-field-${props.source}`}
      data-source={props.source}
    />
  ),
  TextField: (props: { source: string }) => (
    <span
      data-testid={`ra-text-field-${props.source}`}
      data-source={props.source}
    />
  ),
  BooleanField: (props: { source: string }) => (
    <span
      data-testid={`ra-boolean-field-${props.source}`}
      data-source={props.source}
    />
  ),
  ReferenceField: (props: { source: string; reference: string }) => (
    <span
      data-testid={`ra-reference-field-${props.source}`}
      data-source={props.source}
      data-reference={props.reference}
    />
  ),
}));

import { ChallengeOptionsList } from "./list";

describe("ChallengeOptionsList", () => {
  it("renders a List wrapper", () => {
    render(<ChallengeOptionsList />);
    expect(screen.getByTestId("ra-list")).toBeInTheDocument();
  });

  it("renders a Datagrid with rowClick='edit'", () => {
    render(<ChallengeOptionsList />);
    const datagrid = screen.getByTestId("ra-datagrid");
    expect(datagrid).toHaveAttribute("data-row-click", "edit");
  });

  it('renders a NumberField for "id"', () => {
    render(<ChallengeOptionsList />);
    expect(screen.getByTestId("ra-number-field-id")).toHaveAttribute(
      "data-source",
      "id"
    );
  });

  it('renders a TextField for "text"', () => {
    render(<ChallengeOptionsList />);
    expect(screen.getByTestId("ra-text-field-text")).toHaveAttribute(
      "data-source",
      "text"
    );
  });

  it('renders a BooleanField for "correct"', () => {
    render(<ChallengeOptionsList />);
    expect(screen.getByTestId("ra-boolean-field-correct")).toHaveAttribute(
      "data-source",
      "correct"
    );
  });

  it('renders a ReferenceField for "challengeId" referencing "challenges"', () => {
    render(<ChallengeOptionsList />);
    const field = screen.getByTestId("ra-reference-field-challengeId");
    expect(field).toHaveAttribute("data-source", "challengeId");
    expect(field).toHaveAttribute("data-reference", "challenges");
  });

  it('renders a TextField for "imageSrc"', () => {
    render(<ChallengeOptionsList />);
    expect(screen.getByTestId("ra-text-field-imageSrc")).toHaveAttribute(
      "data-source",
      "imageSrc"
    );
  });

  it('renders a TextField for "audioSrc"', () => {
    render(<ChallengeOptionsList />);
    expect(screen.getByTestId("ra-text-field-audioSrc")).toHaveAttribute(
      "data-source",
      "audioSrc"
    );
  });
});
