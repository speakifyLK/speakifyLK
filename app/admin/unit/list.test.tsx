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
    <div data-testid="ra-datagrid" data-row-click={rowClick}>
      {children}
    </div>
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

import { UnitList } from "./list";

describe("UnitList", () => {
  it("renders a List wrapper", () => {
    render(<UnitList />);
    expect(screen.getByTestId("ra-list")).toBeInTheDocument();
  });

  it("renders a Datagrid with rowClick='edit'", () => {
    render(<UnitList />);
    const datagrid = screen.getByTestId("ra-datagrid");
    expect(datagrid).toHaveAttribute("data-row-click", "edit");
  });

  it('renders a NumberField for "id"', () => {
    render(<UnitList />);
    expect(screen.getByTestId("ra-number-field-id")).toHaveAttribute(
      "data-source",
      "id"
    );
  });

  it('renders a TextField for "title"', () => {
    render(<UnitList />);
    expect(screen.getByTestId("ra-text-field-title")).toHaveAttribute(
      "data-source",
      "title"
    );
  });

  it('renders a TextField for "description"', () => {
    render(<UnitList />);
    expect(screen.getByTestId("ra-text-field-description")).toHaveAttribute(
      "data-source",
      "description"
    );
  });

  it('renders a ReferenceField for "courseId" referencing "courses"', () => {
    render(<UnitList />);
    const field = screen.getByTestId("ra-reference-field-courseId");
    expect(field).toHaveAttribute("data-source", "courseId");
    expect(field).toHaveAttribute("data-reference", "courses");
  });

  it('renders a TextField for "order"', () => {
    render(<UnitList />);
    expect(screen.getByTestId("ra-text-field-order")).toHaveAttribute(
      "data-source",
      "order"
    );
  });
});
