import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("react-admin", () => ({
  List: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="ra-list">{children}</div>
  ),
  Datagrid: ({ children, rowClick }: { children: React.ReactNode; rowClick?: string }) => (
    <table data-testid="ra-datagrid" data-row-click={rowClick}>
      <tbody>{children}</tbody>
    </table>
  ),
  NumberField: (props: { source: string }) => (
    <span data-testid={`ra-number-field-${props.source}`} data-source={props.source} />
  ),
  TextField: (props: { source: string }) => (
    <span data-testid={`ra-text-field-${props.source}`} data-source={props.source} />
  ),
  SelectField: (props: { source: string; choices?: { id: string; name: string }[] }) => (
    <span
      data-testid={`ra-select-field-${props.source}`}
      data-source={props.source}
      data-choices={JSON.stringify(props.choices)}
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

import { ChallengeList } from "./list";

describe("ChallengeList", () => {
  it("renders a List wrapper", () => {
    render(<ChallengeList />);
    expect(screen.getByTestId("ra-list")).toBeInTheDocument();
  });

  it("renders a Datagrid with rowClick='edit'", () => {
    render(<ChallengeList />);
    const datagrid = screen.getByTestId("ra-datagrid");
    expect(datagrid).toHaveAttribute("data-row-click", "edit");
  });

  it('renders a NumberField for "id"', () => {
    render(<ChallengeList />);
    expect(screen.getByTestId("ra-number-field-id")).toHaveAttribute("data-source", "id");
  });

  it('renders a TextField for "question"', () => {
    render(<ChallengeList />);
    expect(screen.getByTestId("ra-text-field-question")).toHaveAttribute("data-source", "question");
  });

  it('renders a SelectField for "type" with SELECT and ASSIST choices', () => {
    render(<ChallengeList />);
    const field = screen.getByTestId("ra-select-field-type");
    expect(field).toHaveAttribute("data-source", "type");
    const choices = JSON.parse(field.getAttribute("data-choices")!);
    expect(choices).toEqual([
      { id: "SELECT", name: "SELECT" },
      { id: "ASSIST", name: "ASSIST" },
    ]);
  });

  it('renders a ReferenceField for "lessonId" referencing "lessons"', () => {
    render(<ChallengeList />);
    const field = screen.getByTestId("ra-reference-field-lessonId");
    expect(field).toHaveAttribute("data-source", "lessonId");
    expect(field).toHaveAttribute("data-reference", "lessons");
  });

  it('renders a NumberField for "order"', () => {
    render(<ChallengeList />);
    expect(screen.getByTestId("ra-number-field-order")).toHaveAttribute("data-source", "order");
  });
});
