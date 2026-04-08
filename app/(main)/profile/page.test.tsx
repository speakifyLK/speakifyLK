import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockRedirect = vi.hoisted(() =>
  vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  })
);
const mockGetUserProgress = vi.hoisted(() => vi.fn());
const mockGetUserSubscription = vi.hoisted(() => vi.fn());
const mockGetProfileStats = vi.hoisted(() => vi.fn());
const mockGetQuizStats = vi.hoisted(() => vi.fn());
const mockGetUserActivityHeatmap = vi.hoisted(() => vi.fn());
const mockGetStreakData = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("@/db/queries", () => ({
  getUserProgress: mockGetUserProgress,
  getUserSubscription: mockGetUserSubscription,
  getProfileStats: mockGetProfileStats,
  getQuizStats: mockGetQuizStats,
  getUserActivityHeatmap: mockGetUserActivityHeatmap,
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
vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: any) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, className }: any) => (
    <img data-testid="avatar-image" src={src} className={className} />
  ),
}));
vi.mock("@/components/ui/separator", () => ({
  Separator: (props: any) => <hr data-testid="separator" className={props.className} />,
}));
vi.mock("@/components/profile/activity-heatmap", () => ({
  ActivityHeatmap: ({ activityData }: any) => (
    <div data-testid="activity-heatmap">{activityData.length} days</div>
  ),
}));
vi.mock("@/components/profile/streak-card", () => ({
  StreakCard: (props: any) => <div data-testid="streak-card">{JSON.stringify(props)}</div>,
}));
vi.mock("@/components/profile/stats-overview", () => ({
  StatsOverview: (props: any) => <div data-testid="stats-overview">{JSON.stringify(props)}</div>,
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

const baseProfileStats = {
  totalXp: 100,
  totalLessonsCompleted: 10,
  totalQuizzesCompleted: 5,
  totalActiveDays: 20,
  currentStreak: 3,
  longestStreak: 7,
  memberSince: "2024-01-15",
};

const baseQuizStats = {
  totalQuizzes: 5,
  averageScore: 75,
  favouriteTopic: "Greetings",
  improvementTrend: "improving" as const,
  quizStreak: 2,
};

const baseActivityHeatmap = [
  {
    date: "2025-06-10",
    lessonsCompleted: 2,
    quizzesCompleted: 1,
    xpEarned: 30,
  },
  {
    date: "2025-06-11",
    lessonsCompleted: 1,
    quizzesCompleted: 0,
    xpEarned: 10,
  },
];

describe("ProfilePage", () => {
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

  it("redirects to /courses when no user progress", async () => {
    mockGetUserProgress.mockResolvedValue(null);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetProfileStats.mockResolvedValue(baseProfileStats);
    mockGetQuizStats.mockResolvedValue(baseQuizStats);
    mockGetUserActivityHeatmap.mockResolvedValue([]);

    const Page = (await import("./page")).default;
    await expect(Page()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/courses");
  });

  it("redirects to /courses when no active course", async () => {
    mockGetUserProgress.mockResolvedValue({
      ...baseUserProgress,
      activeCourse: null,
    });
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetProfileStats.mockResolvedValue(baseProfileStats);
    mockGetQuizStats.mockResolvedValue(baseQuizStats);
    mockGetUserActivityHeatmap.mockResolvedValue([]);

    const Page = (await import("./page")).default;
    await expect(Page()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/courses");
  });

  it("renders profile page with user data", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetProfileStats.mockResolvedValue(baseProfileStats);
    mockGetQuizStats.mockResolvedValue(baseQuizStats);
    mockGetUserActivityHeatmap.mockResolvedValue(baseActivityHeatmap);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("Learning Sinhala")).toBeInTheDocument();
  });

  it("renders user avatar", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetProfileStats.mockResolvedValue(baseProfileStats);
    mockGetQuizStats.mockResolvedValue(baseQuizStats);
    mockGetUserActivityHeatmap.mockResolvedValue(baseActivityHeatmap);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByTestId("avatar")).toBeInTheDocument();
    expect(screen.getByTestId("avatar-image")).toBeInTheDocument();
  });

  it("renders course image", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetProfileStats.mockResolvedValue(baseProfileStats);
    mockGetQuizStats.mockResolvedValue(baseQuizStats);
    mockGetUserActivityHeatmap.mockResolvedValue(baseActivityHeatmap);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByAltText("Sinhala")).toBeInTheDocument();
  });

  it("renders member since date when available", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetProfileStats.mockResolvedValue(baseProfileStats);
    mockGetQuizStats.mockResolvedValue(baseQuizStats);
    mockGetUserActivityHeatmap.mockResolvedValue(baseActivityHeatmap);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText(/Active since/)).toBeInTheDocument();
    expect(screen.getByText(/January 2024/)).toBeInTheDocument();
  });

  it("does not render member since when null", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetProfileStats.mockResolvedValue({
      ...baseProfileStats,
      memberSince: null,
    });
    mockGetQuizStats.mockResolvedValue(baseQuizStats);
    mockGetUserActivityHeatmap.mockResolvedValue(baseActivityHeatmap);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.queryByText(/Active since/)).not.toBeInTheDocument();
  });

  it("renders PRO badge when user is pro", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue({ isActive: true });
    mockGetProfileStats.mockResolvedValue(baseProfileStats);
    mockGetQuizStats.mockResolvedValue(baseQuizStats);
    mockGetUserActivityHeatmap.mockResolvedValue(baseActivityHeatmap);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("PRO")).toBeInTheDocument();
    expect(screen.queryByTestId("promo")).not.toBeInTheDocument();
  });

  it("renders Promo when user is not pro", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetProfileStats.mockResolvedValue(baseProfileStats);
    mockGetQuizStats.mockResolvedValue(baseQuizStats);
    mockGetUserActivityHeatmap.mockResolvedValue(baseActivityHeatmap);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByTestId("promo")).toBeInTheDocument();
    expect(screen.queryByText("PRO")).not.toBeInTheDocument();
  });

  it("renders streak card component", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetProfileStats.mockResolvedValue(baseProfileStats);
    mockGetQuizStats.mockResolvedValue(baseQuizStats);
    mockGetUserActivityHeatmap.mockResolvedValue(baseActivityHeatmap);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("Streak")).toBeInTheDocument();
    expect(screen.getByTestId("streak-card")).toBeInTheDocument();
  });

  it("renders activity heatmap component", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetProfileStats.mockResolvedValue(baseProfileStats);
    mockGetQuizStats.mockResolvedValue(baseQuizStats);
    mockGetUserActivityHeatmap.mockResolvedValue(baseActivityHeatmap);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("Activity")).toBeInTheDocument();
    expect(screen.getByTestId("activity-heatmap")).toBeInTheDocument();
    expect(screen.getByText("20 active days in the past year")).toBeInTheDocument();
  });

  it("renders stats overview component", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetProfileStats.mockResolvedValue(baseProfileStats);
    mockGetQuizStats.mockResolvedValue(baseQuizStats);
    mockGetUserActivityHeatmap.mockResolvedValue(baseActivityHeatmap);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByTestId("stats-overview")).toBeInTheDocument();
  });

  it("renders separators", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetProfileStats.mockResolvedValue(baseProfileStats);
    mockGetQuizStats.mockResolvedValue(baseQuizStats);
    mockGetUserActivityHeatmap.mockResolvedValue(baseActivityHeatmap);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    const separators = screen.getAllByTestId("separator");
    expect(separators.length).toBe(3);
  });

  it("renders user progress component", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetProfileStats.mockResolvedValue(baseProfileStats);
    mockGetQuizStats.mockResolvedValue(baseQuizStats);
    mockGetUserActivityHeatmap.mockResolvedValue(baseActivityHeatmap);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByTestId("user-progress")).toBeInTheDocument();
  });
});
