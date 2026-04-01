import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockGetCourses = vi.hoisted(() => vi.fn());
const mockGetUserProgress = vi.hoisted(() => vi.fn());

vi.mock("@/db/queries", () => ({
  getCourses: mockGetCourses,
  getUserProgress: mockGetUserProgress,
}));

vi.mock("./list", () => ({
  List: ({ courses, activeCourseId }: any) => (
    <div data-testid="list" data-active-course-id={activeCourseId}>
      {courses.map((c: any) => (
        <span key={c.id}>{c.title}</span>
      ))}
    </div>
  ),
}));

describe("CoursesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders heading and list with user progress", async () => {
    mockGetCourses.mockResolvedValue([
      { id: 1, title: "Sinhala", imageSrc: "/sinhala.svg" },
    ]);
    mockGetUserProgress.mockResolvedValue({
      activeCourseId: 1,
    });

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("Language Courses")).toBeInTheDocument();
    expect(screen.getByTestId("list")).toBeInTheDocument();
    expect(screen.getByText("Sinhala")).toBeInTheDocument();
    expect(screen.getByTestId("list")).toHaveAttribute(
      "data-active-course-id",
      "1"
    );
  });

  it("renders list without active course when no user progress", async () => {
    mockGetCourses.mockResolvedValue([
      { id: 1, title: "Sinhala", imageSrc: "/sinhala.svg" },
    ]);
    mockGetUserProgress.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("Language Courses")).toBeInTheDocument();
    expect(screen.getByTestId("list")).toBeInTheDocument();
  });

  it("renders with empty courses list", async () => {
    mockGetCourses.mockResolvedValue([]);
    mockGetUserProgress.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("Language Courses")).toBeInTheDocument();
    expect(screen.getByTestId("list")).toBeInTheDocument();
  });
});
