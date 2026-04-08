import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockRedirect = vi.hoisted(() =>
  vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  })
);
const mockAuth = vi.hoisted(() => vi.fn().mockResolvedValue({ userId: "user_123" }));
const mockGetUserProgress = vi.hoisted(() => vi.fn());
const mockGetUserSubscription = vi.hoisted(() => vi.fn());
const mockGetQuizSessionWithQuestions = vi.hoisted(() => vi.fn());
const mockGetUnitsForQuiz = vi.hoisted(() => vi.fn());
const mockGetQuizHistory = vi.hoisted(() => vi.fn());
const mockGetQuizStats = vi.hoisted(() => vi.fn());
const mockGetStreakData = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

vi.mock("@/db/queries", () => ({
  getUserProgress: mockGetUserProgress,
  getUserSubscription: mockGetUserSubscription,
  getQuizSessionWithQuestions: mockGetQuizSessionWithQuestions,
  getUnitsForQuiz: mockGetUnitsForQuiz,
  getQuizHistory: mockGetQuizHistory,
  getQuizStats: mockGetQuizStats,
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
vi.mock("@/components/quiz/quiz-config", () => ({
  QuizConfig: (props: any) => <div data-testid="quiz-config">{JSON.stringify(props)}</div>,
}));
vi.mock("@/components/quiz/quiz-play", () => ({
  QuizPlay: (props: any) => <div data-testid="quiz-play">{JSON.stringify(props)}</div>,
}));
vi.mock("@/components/quiz/quiz-history", () => ({
  QuizHistory: (props: any) => <div data-testid="quiz-history">{JSON.stringify(props)}</div>,
}));
vi.mock("../learn/header", () => ({
  Header: ({ title }: any) => <div data-testid="header">{title}</div>,
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

describe("AIQuizPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetStreakData.mockResolvedValue({
      currentStreak: 3,
      longestStreak: 7,
      totalActiveDays: 20,
    });
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetUnitsForQuiz.mockResolvedValue([{ id: 1, title: "Unit 1" }]);
    mockGetQuizHistory.mockResolvedValue([]);
    mockGetQuizStats.mockResolvedValue(null);
    mockGetQuizSessionWithQuestions.mockResolvedValue(null);
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("redirects to /sign-in when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const Page = (await import("./page")).default;
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
  });

  it("redirects to /courses when no user progress", async () => {
    mockGetUserProgress.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/courses");
  });

  it("redirects to /courses when no active course", async () => {
    mockGetUserProgress.mockResolvedValue({
      ...baseUserProgress,
      activeCourse: null,
    });

    const Page = (await import("./page")).default;
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/courses");
  });

  it("renders config view when no sessionId", async () => {
    const Page = (await import("./page")).default;
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByTestId("header")).toHaveTextContent("AI Quiz");
    expect(screen.getByTestId("quiz-config")).toBeInTheDocument();
    expect(screen.getByTestId("user-progress")).toBeInTheDocument();
    expect(screen.getByTestId("quests")).toBeInTheDocument();
  });

  it("shows Promo when user is not pro", async () => {
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByTestId("promo")).toBeInTheDocument();
  });

  it("does not show Promo when user is pro", async () => {
    mockGetUserSubscription.mockResolvedValue({ isActive: true });

    const Page = (await import("./page")).default;
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.queryByTestId("promo")).not.toBeInTheDocument();
  });

  it("shows QuizHistory when quizStats is present", async () => {
    mockGetQuizStats.mockResolvedValue({
      totalQuizzes: 10,
      averageScore: 80,
      favouriteTopic: "Sinhala",
      improvementTrend: "up",
      quizStreak: 3,
    });

    const Page = (await import("./page")).default;
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByTestId("quiz-history")).toBeInTheDocument();
  });

  it("does not show QuizHistory when quizStats is null", async () => {
    mockGetQuizStats.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.queryByTestId("quiz-history")).not.toBeInTheDocument();
  });

  it("renders QuizPlay when a valid session is found", async () => {
    const mockSession = { id: 1, topic: "Greetings", questions: [] };
    mockGetQuizSessionWithQuestions.mockResolvedValue(mockSession);

    const Page = (await import("./page")).default;
    const jsx = await Page({
      searchParams: Promise.resolve({ sessionId: "1" }),
    });
    render(jsx);

    expect(screen.getByTestId("quiz-play")).toBeInTheDocument();
  });

  it("redirects to /ai-quiz when sessionId given but session not found", async () => {
    mockGetQuizSessionWithQuestions.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    await expect(Page({ searchParams: Promise.resolve({ sessionId: "999" }) })).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(mockRedirect).toHaveBeenCalledWith("/ai-quiz");
  });

  it("handles non-numeric sessionId gracefully (treats as no session)", async () => {
    const Page = (await import("./page")).default;
    const jsx = await Page({
      searchParams: Promise.resolve({ sessionId: "abc" }),
    });
    render(jsx);

    // NaN sessionId should show config view
    expect(screen.getByTestId("quiz-config")).toBeInTheDocument();
  });
});
