import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockRedirect = vi.hoisted(() =>
  vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  })
);
const mockGetUserProgress = vi.hoisted(() => vi.fn());
const mockGetUserSubscription = vi.hoisted(() => vi.fn());
const mockGetCourseProgress = vi.hoisted(() => vi.fn());
const mockGetLessonPercentage = vi.hoisted(() => vi.fn());
const mockGetUnits = vi.hoisted(() => vi.fn());
const mockGetStreakData = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/db/queries", () => ({
  getUserProgress: mockGetUserProgress,
  getUserSubscription: mockGetUserSubscription,
  getCourseProgress: mockGetCourseProgress,
  getLessonPercentage: mockGetLessonPercentage,
  getUnits: mockGetUnits,
  getStreakData: mockGetStreakData,
}));

vi.mock("@/components/feed-wrapper", () => ({
  FeedWrapper: ({ children }: any) => <div data-testid="feed-wrapper">{children}</div>,
}));
vi.mock("@/components/sticky-wrapper", () => ({
  StickyWrapper: ({ children }: any) => <div data-testid="sticky-wrapper">{children}</div>,
}));
vi.mock("@/components/user-progress", () => ({
  UserProgress: (props: any) => <div data-testid="user-progress">{JSON.stringify(props)}</div>,
}));
vi.mock("@/components/promo", () => ({
  Promo: () => <div data-testid="promo">Promo</div>,
}));
vi.mock("@/components/quests", () => ({
  Quests: ({ points }: any) => <div data-testid="quests">Quests: {points}</div>,
}));
vi.mock("./header", () => ({
  Header: ({ title }: any) => <div data-testid="header">{title}</div>,
}));
vi.mock("./unit", () => ({
  Unit: ({ id, title }: any) => <div data-testid={`unit-${id}`}>{title}</div>,
}));

const activeCourse = { id: 1, title: "Sinhala", imageSrc: "/sinhala.svg" };

const baseUserProgress = {
  userId: "user_123",
  userName: "Test User",
  userImageSrc: "/mascot.svg",
  activeCourseId: 1,
  hearts: 5,
  points: 100,
  activeCourse,
};

const activeLesson = {
  id: 1,
  title: "Lesson 1",
  unitId: 1,
  order: 1,
  unit: {
    id: 1,
    title: "Unit 1",
    description: "Basics",
    courseId: 1,
    order: 1,
  },
};

describe("LearnPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStreakData.mockResolvedValue({
      currentStreak: 3,
      longestStreak: 7,
      totalActiveDays: 20,
    });
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("redirects to /courses when no course progress", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetCourseProgress.mockResolvedValue(null);
    mockGetLessonPercentage.mockResolvedValue(0);
    mockGetUnits.mockResolvedValue([]);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    await expect(Page()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/courses");
  });

  it("redirects to /courses when no user progress", async () => {
    mockGetUserProgress.mockResolvedValue(null);
    mockGetCourseProgress.mockResolvedValue({ activeLesson });
    mockGetLessonPercentage.mockResolvedValue(50);
    mockGetUnits.mockResolvedValue([]);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    await expect(Page()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/courses");
  });

  it("redirects when no active course", async () => {
    mockGetUserProgress.mockResolvedValue({
      ...baseUserProgress,
      activeCourse: null,
    });
    mockGetCourseProgress.mockResolvedValue({ activeLesson });
    mockGetLessonPercentage.mockResolvedValue(50);
    mockGetUnits.mockResolvedValue([]);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    await expect(Page()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/courses");
  });

  it("renders learn page with units", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetCourseProgress.mockResolvedValue({ activeLesson });
    mockGetLessonPercentage.mockResolvedValue(50);
    mockGetUnits.mockResolvedValue([
      { id: 1, order: 1, title: "Unit 1", description: "Basics", lessons: [] },
      {
        id: 2,
        order: 2,
        title: "Unit 2",
        description: "Advanced",
        lessons: [],
      },
    ]);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByTestId("header")).toHaveTextContent("Sinhala");
    expect(screen.getByTestId("unit-1")).toBeInTheDocument();
    expect(screen.getByTestId("unit-2")).toBeInTheDocument();
  });

  it("shows Promo when user is not pro", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetCourseProgress.mockResolvedValue({ activeLesson });
    mockGetLessonPercentage.mockResolvedValue(50);
    mockGetUnits.mockResolvedValue([]);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByTestId("promo")).toBeInTheDocument();
  });

  it("does not show Promo when user is pro", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetCourseProgress.mockResolvedValue({ activeLesson });
    mockGetLessonPercentage.mockResolvedValue(50);
    mockGetUnits.mockResolvedValue([]);
    mockGetUserSubscription.mockResolvedValue({ isActive: true });

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.queryByTestId("promo")).not.toBeInTheDocument();
  });

  it("renders quests with user points", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetCourseProgress.mockResolvedValue({ activeLesson });
    mockGetLessonPercentage.mockResolvedValue(50);
    mockGetUnits.mockResolvedValue([]);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByTestId("quests")).toHaveTextContent("Quests: 100");
  });
});
