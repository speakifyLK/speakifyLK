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
  ReferenceField: (props: { source: string; reference: string }) => (
    <span
      data-testid={`ra-reference-field-${props.source}`}
      data-source={props.source}
      data-reference={props.reference}
    />
  ),
}));

import { LessonList } from "./list";

describe("LessonList", () => {
  it("renders a List wrapper", () => {
    render(<LessonList />);
    expect(screen.getByTestId("ra-list")).toBeInTheDocument();
  });

  it("renders a Datagrid with rowClick='edit'", () => {
    render(<LessonList />);
    const datagrid = screen.getByTestId("ra-datagrid");
    expect(datagrid).toHaveAttribute("data-row-click", "edit");
  });

  it('renders a NumberField for "id"', () => {
    render(<LessonList />);
    expect(screen.getByTestId("ra-number-field-id")).toHaveAttribute(
      "data-source",
      "id"
    );
  });

  it('renders a TextField for "title"', () => {
    render(<LessonList />);
    expect(screen.getByTestId("ra-text-field-title")).toHaveAttribute(
      "data-source",
      "title"
    );
  });

  it('renders a ReferenceField for "unitId" referencing "units"', () => {
    render(<LessonList />);
    const field = screen.getByTestId("ra-reference-field-unitId");
    expect(field).toHaveAttribute("data-source", "unitId");
    expect(field).toHaveAttribute("data-reference", "units");
  });

  it('renders a NumberField for "order"', () => {
    render(<LessonList />);
    expect(screen.getByTestId("ra-number-field-order")).toHaveAttribute(
      "data-source",
      "order"
    );
  });
});
