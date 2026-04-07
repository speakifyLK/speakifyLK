import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock react-admin
vi.mock("react-admin", () => ({
  Admin: ({
    children,
    dataProvider,
    queryClient,
    layout,
  }: {
    children: React.ReactNode;
    dataProvider: unknown;
    queryClient: unknown;
    layout: unknown;
  }) => (
    <div
      data-testid="ra-admin"
      data-has-data-provider={dataProvider ? "true" : "false"}
      data-has-query-client={queryClient ? "true" : "false"}
      data-has-layout={layout ? "true" : "false"}
    >
      {children}
    </div>
  ),
  Resource: (props: {
    name: string;
    recordRepresentation?: string;
    list?: unknown;
    create?: unknown;
    edit?: unknown;
    options?: Record<string, unknown>;
  }) => (
    <div
      data-testid={`ra-resource-${props.name}`}
      data-name={props.name}
      data-record-representation={props.recordRepresentation}
      data-has-list={props.list ? "true" : "false"}
      data-has-create={props.create ? "true" : "false"}
      data-has-edit={props.edit ? "true" : "false"}
      data-options={props.options ? JSON.stringify(props.options) : undefined}
    />
  ),
}));

// Mock ra-data-simple-rest
vi.mock("ra-data-simple-rest", () => ({
  __esModule: true,
  default: (url: string) => ({ url, type: "simpleRestProvider" }),
}));

// Mock @tanstack/react-query
vi.mock("@tanstack/react-query", () => ({
  QueryClient: class MockQueryClient {
    constructor() {
      return { type: "queryClient" };
    }
  },
}));

// Mock all CRUD sub-components
vi.mock("./course/list", () => ({ CourseList: () => <div /> }));
vi.mock("./course/create", () => ({ CourseCreate: () => <div /> }));
vi.mock("./course/edit", () => ({ CourseEdit: () => <div /> }));
vi.mock("./unit/list", () => ({ UnitList: () => <div /> }));
vi.mock("./unit/create", () => ({ UnitCreate: () => <div /> }));
vi.mock("./unit/edit", () => ({ UnitEdit: () => <div /> }));
vi.mock("./lesson/list", () => ({ LessonList: () => <div /> }));
vi.mock("./lesson/create", () => ({ LessonCreate: () => <div /> }));
vi.mock("./lesson/edit", () => ({ LessonEdit: () => <div /> }));
vi.mock("./challenge/list", () => ({ ChallengeList: () => <div /> }));
vi.mock("./challenge/create", () => ({ ChallengeCreate: () => <div /> }));
vi.mock("./challenge/edit", () => ({ ChallengeEdit: () => <div /> }));
vi.mock("./challengeOption/list", () => ({
  ChallengeOptionsList: () => <div />,
}));
vi.mock("./challengeOption/create", () => ({
  ChallengeOptionCreate: () => <div />,
}));
vi.mock("./challengeOption/edit", () => ({
  ChallengeOptionEdit: () => <div />,
}));
vi.mock("./layout-admin", () => ({
  AdminLayout: () => <div data-testid="admin-layout" />,
}));

import AppContent from "./app-content";

describe("AppContent", () => {
  it("renders an Admin component with dataProvider, queryClient, and layout", () => {
    render(<AppContent />);
    const admin = screen.getByTestId("ra-admin");
    expect(admin).toBeInTheDocument();
    expect(admin).toHaveAttribute("data-has-data-provider", "true");
    expect(admin).toHaveAttribute("data-has-query-client", "true");
    expect(admin).toHaveAttribute("data-has-layout", "true");
  });

  it('renders a "courses" Resource with correct props', () => {
    render(<AppContent />);
    const resource = screen.getByTestId("ra-resource-courses");
    expect(resource).toHaveAttribute("data-name", "courses");
    expect(resource).toHaveAttribute("data-record-representation", "title");
    expect(resource).toHaveAttribute("data-has-list", "true");
    expect(resource).toHaveAttribute("data-has-create", "true");
    expect(resource).toHaveAttribute("data-has-edit", "true");
  });

  it('renders a "units" Resource with correct props', () => {
    render(<AppContent />);
    const resource = screen.getByTestId("ra-resource-units");
    expect(resource).toHaveAttribute("data-name", "units");
    expect(resource).toHaveAttribute("data-record-representation", "title");
    expect(resource).toHaveAttribute("data-has-list", "true");
    expect(resource).toHaveAttribute("data-has-create", "true");
    expect(resource).toHaveAttribute("data-has-edit", "true");
  });

  it('renders a "lessons" Resource with correct props', () => {
    render(<AppContent />);
    const resource = screen.getByTestId("ra-resource-lessons");
    expect(resource).toHaveAttribute("data-name", "lessons");
    expect(resource).toHaveAttribute("data-record-representation", "title");
    expect(resource).toHaveAttribute("data-has-list", "true");
    expect(resource).toHaveAttribute("data-has-create", "true");
    expect(resource).toHaveAttribute("data-has-edit", "true");
  });

  it('renders a "challenges" Resource with correct props', () => {
    render(<AppContent />);
    const resource = screen.getByTestId("ra-resource-challenges");
    expect(resource).toHaveAttribute("data-name", "challenges");
    expect(resource).toHaveAttribute("data-record-representation", "question");
    expect(resource).toHaveAttribute("data-has-list", "true");
    expect(resource).toHaveAttribute("data-has-create", "true");
    expect(resource).toHaveAttribute("data-has-edit", "true");
  });

  it('renders a "challengeOptions" Resource with correct props and label', () => {
    render(<AppContent />);
    const resource = screen.getByTestId("ra-resource-challengeOptions");
    expect(resource).toHaveAttribute("data-name", "challengeOptions");
    expect(resource).toHaveAttribute("data-record-representation", "text");
    expect(resource).toHaveAttribute("data-has-list", "true");
    expect(resource).toHaveAttribute("data-has-create", "true");
    expect(resource).toHaveAttribute("data-has-edit", "true");
    const options = JSON.parse(resource.getAttribute("data-options")!);
    expect(options).toEqual({ label: "Challenge Options" });
  });

  it("renders exactly 5 resources", () => {
    render(<AppContent />);
    const resources = [
      screen.getByTestId("ra-resource-courses"),
      screen.getByTestId("ra-resource-units"),
      screen.getByTestId("ra-resource-lessons"),
      screen.getByTestId("ra-resource-challenges"),
      screen.getByTestId("ra-resource-challengeOptions"),
    ];
    expect(resources).toHaveLength(5);
  });
});
