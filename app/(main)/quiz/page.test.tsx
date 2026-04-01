import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockRedirect = vi.hoisted(() =>
  vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  })
);
const mockGetUserProgress = vi.hoisted(() => vi.fn());
const mockGetUserSubscription = vi.hoisted(() => vi.fn());
const mockGetQuizSessionWithQuestions = vi.hoisted(() => vi.fn());
const mockGetUnitsForQuiz = vi.hoisted(() => vi.fn());
const mockGetQuizHistory = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/db/queries", () => ({
  getUserProgress: mockGetUserProgress,
  getUserSubscription: mockGetUserSubscription,
  getQuizSessionWithQuestions: mockGetQuizSessionWithQuestions,
  getUnitsForQuiz: mockGetUnitsForQuiz,
  getQuizHistory: mockGetQuizHistory,
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

describe("QuizPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  // --- No sessionId branch ---

  it("renders config view when no sessionId", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetUnitsForQuiz.mockResolvedValue([{ id: 1, title: "Unit 1" }]);
    mockGetQuizHistory.mockResolvedValue([]);

    const Page = (await import("./page")).default;
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByTestId("header")).toHaveTextContent("Quiz");
    expect(screen.getByTestId("quiz-config")).toBeInTheDocument();
  });

  it("redirects to /courses when no user progress (no sessionId)", async () => {
    mockGetUserProgress.mockResolvedValue(null);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetUnitsForQuiz.mockResolvedValue([]);
    mockGetQuizHistory.mockResolvedValue([]);

    const Page = (await import("./page")).default;
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/courses");
  });

  it("shows Promo when user is not pro (no sessionId)", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetUnitsForQuiz.mockResolvedValue([]);
    mockGetQuizHistory.mockResolvedValue([]);

    const Page = (await import("./page")).default;
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByTestId("promo")).toBeInTheDocument();
  });

  it("does not show Promo when user is pro (no sessionId)", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue({ isActive: true });
    mockGetUnitsForQuiz.mockResolvedValue([]);
    mockGetQuizHistory.mockResolvedValue([]);

    const Page = (await import("./page")).default;
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.queryByTestId("promo")).not.toBeInTheDocument();
  });

  // --- With sessionId branch ---

  it("renders QuizPlay when valid session exists", async () => {
    const mockSession = { id: 1, topic: "Greetings", questions: [] };
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetQuizSessionWithQuestions.mockResolvedValue(mockSession);

    const Page = (await import("./page")).default;
    const jsx = await Page({
      searchParams: Promise.resolve({ sessionId: "1" }),
    });
    render(jsx);

    expect(screen.getByTestId("quiz-play")).toBeInTheDocument();
    expect(screen.getByTestId("header")).toHaveTextContent("Quiz");
  });

  it("redirects to /courses when no user progress (with sessionId)", async () => {
    mockGetUserProgress.mockResolvedValue(null);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetQuizSessionWithQuestions.mockResolvedValue({ id: 1 });

    const Page = (await import("./page")).default;
    await expect(Page({ searchParams: Promise.resolve({ sessionId: "1" }) })).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(mockRedirect).toHaveBeenCalledWith("/courses");
  });

  it("redirects to /quiz when session not found", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetQuizSessionWithQuestions.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    await expect(Page({ searchParams: Promise.resolve({ sessionId: "999" }) })).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(mockRedirect).toHaveBeenCalledWith("/quiz");
  });

  it("shows Promo when user is not pro (with sessionId)", async () => {
    const mockSession = { id: 1, topic: "Greetings", questions: [] };
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetQuizSessionWithQuestions.mockResolvedValue(mockSession);

    const Page = (await import("./page")).default;
    const jsx = await Page({
      searchParams: Promise.resolve({ sessionId: "1" }),
    });
    render(jsx);

    expect(screen.getByTestId("promo")).toBeInTheDocument();
  });

  it("does not show Promo when user is pro (with sessionId)", async () => {
    const mockSession = { id: 1, topic: "Greetings", questions: [] };
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue({ isActive: true });
    mockGetQuizSessionWithQuestions.mockResolvedValue(mockSession);

    const Page = (await import("./page")).default;
    const jsx = await Page({
      searchParams: Promise.resolve({ sessionId: "1" }),
    });
    render(jsx);

    expect(screen.queryByTestId("promo")).not.toBeInTheDocument();
  });
});
