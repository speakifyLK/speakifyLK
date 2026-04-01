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
}));

import { CourseList } from "./list";

describe("CourseList", () => {
  it("renders a List wrapper", () => {
    render(<CourseList />);
    expect(screen.getByTestId("ra-list")).toBeInTheDocument();
  });

  it("renders a Datagrid with rowClick='edit'", () => {
    render(<CourseList />);
    const datagrid = screen.getByTestId("ra-datagrid");
    expect(datagrid).toBeInTheDocument();
    expect(datagrid).toHaveAttribute("data-row-click", "edit");
  });

  it('renders a NumberField for "id"', () => {
    render(<CourseList />);
    const field = screen.getByTestId("ra-number-field-id");
    expect(field).toBeInTheDocument();
    expect(field).toHaveAttribute("data-source", "id");
  });

  it('renders a TextField for "title"', () => {
    render(<CourseList />);
    const field = screen.getByTestId("ra-text-field-title");
    expect(field).toBeInTheDocument();
    expect(field).toHaveAttribute("data-source", "title");
  });

  it('renders a TextField for "imageSrc"', () => {
    render(<CourseList />);
    const field = screen.getByTestId("ra-text-field-imageSrc");
    expect(field).toBeInTheDocument();
    expect(field).toHaveAttribute("data-source", "imageSrc");
  });
});
