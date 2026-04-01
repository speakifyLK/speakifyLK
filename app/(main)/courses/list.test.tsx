import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockPush = vi.hoisted(() => vi.fn());
const mockUpsertUserProgress = vi.hoisted(() => vi.fn());
const { mockPending } = vi.hoisted(() => ({ mockPending: { value: false } }));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useTransition: () => [mockPending.value, (fn: any) => fn()],
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/actions/user-progress", () => ({
  upsertUserProgress: mockUpsertUserProgress,
}));

vi.mock("@/db/schema", () => ({
  courses: { $inferSelect: {} },
  userProgress: { $inferSelect: { activeCourseId: 1 } },
}));

vi.mock("./card", () => ({
  Card: ({ title, id, onClick, disabled, isActive }: any) => (
    <button
      data-testid={`card-${id}`}
      data-disabled={disabled}
      data-active={isActive}
      onClick={() => onClick(id)}
    >
      {title}
    </button>
  ),
}));

import { List } from "./list";

const courses = [
  { id: 1, title: "Sinhala", imageSrc: "/sinhala.svg" },
  { id: 2, title: "Tamil", imageSrc: "/tamil.svg" },
];

describe("List", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertUserProgress.mockResolvedValue(undefined);
    mockPending.value = false;
  });

  it("renders all course cards", () => {
    render(<List courses={courses} activeCourseId={1} />);
    expect(screen.getByTestId("card-1")).toBeInTheDocument();
    expect(screen.getByTestId("card-2")).toBeInTheDocument();
  });

  it("marks active course card as active", () => {
    render(<List courses={courses} activeCourseId={1} />);
    expect(screen.getByTestId("card-1")).toHaveAttribute("data-active", "true");
    expect(screen.getByTestId("card-2")).toHaveAttribute("data-active", "false");
  });

  it("navigates to /learn when clicking active course", () => {
    render(<List courses={courses} activeCourseId={1} />);
    fireEvent.click(screen.getByTestId("card-1"));
    expect(mockPush).toHaveBeenCalledWith("/learn");
  });

  it("calls upsertUserProgress when clicking a different course", () => {
    render(<List courses={courses} activeCourseId={1} />);
    fireEvent.click(screen.getByTestId("card-2"));
    expect(mockUpsertUserProgress).toHaveBeenCalledWith(2);
  });

  it("renders without activeCourseId", () => {
    render(<List courses={courses} />);
    expect(screen.getByTestId("card-1")).toHaveAttribute("data-active", "false");
    expect(screen.getByTestId("card-2")).toHaveAttribute("data-active", "false");
  });

  it("renders correct grid container", () => {
    const { container } = render(<List courses={courses} activeCourseId={1} />);
    const grid = container.firstElementChild;
    expect(grid).toHaveClass("grid", "grid-cols-2", "gap-4", "pt-6");
  });

  it("does not call any action when pending", () => {
    mockPending.value = true;
    render(<List courses={courses} activeCourseId={1} />);
    fireEvent.click(screen.getByTestId("card-2"));
    expect(mockUpsertUserProgress).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    mockPending.value = false;
  });

  it("shows error toast when upsertUserProgress fails", async () => {
    const { toast } = await import("sonner");
    mockUpsertUserProgress.mockRejectedValue(new Error("fail"));
    render(<List courses={courses} activeCourseId={1} />);
    fireEvent.click(screen.getByTestId("card-2"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong.");
    });
  });
});
