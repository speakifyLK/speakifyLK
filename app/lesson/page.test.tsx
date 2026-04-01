import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Hoisted mocks ────────────────────────────────────────────────────
const mockRedirect = vi.hoisted(() =>
  vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  })
);
const mockGetLesson = vi.hoisted(() => vi.fn());
const mockGetUserProgress = vi.hoisted(() => vi.fn());
const mockGetUserSubscription = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: (fn: any) => fn,
  };
});

vi.mock("@/db/queries", () => ({
  getLesson: mockGetLesson,
  getUserProgress: mockGetUserProgress,
  getUserSubscription: mockGetUserSubscription,
}));

vi.mock("./quiz", () => ({
  Quiz: (props: any) => (
    <div
      data-testid="quiz"
      data-lesson-id={props.initialLessonId}
      data-hearts={props.initialHearts}
      data-percentage={props.initialPercentage}
      data-has-sub={!!props.userSubscription?.isActive}
      data-challenge-count={props.initialLessonChallenges.length}
    >
      Quiz
    </div>
  ),
}));

const lesson = {
  id: 1,
  title: "Lesson 1",
  unitId: 1,
  order: 1,
  challenges: [
    {
      id: 10,
      lessonId: 1,
      type: "SELECT",
      question: "Q1",
      order: 1,
      completed: true,
      challengeOptions: [],
    },
    {
      id: 11,
      lessonId: 1,
      type: "SELECT",
      question: "Q2",
      order: 2,
      completed: false,
      challengeOptions: [],
    },
  ],
};

const userProgress = {
  userId: "user_123",
  userName: "Test",
  userImageSrc: "/mascot.svg",
  activeCourseId: 1,
  hearts: 3,
  points: 50,
};

describe("LessonPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("redirects to /learn when no lesson", async () => {
    mockGetLesson.mockResolvedValue(null);
    mockGetUserProgress.mockResolvedValue(userProgress);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    await expect(Page()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/learn");
  });

  it("redirects to /learn when no user progress", async () => {
    mockGetLesson.mockResolvedValue(lesson);
    mockGetUserProgress.mockResolvedValue(null);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    await expect(Page()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/learn");
  });

  it("renders Quiz with correct props", async () => {
    mockGetLesson.mockResolvedValue(lesson);
    mockGetUserProgress.mockResolvedValue(userProgress);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    const quiz = screen.getByTestId("quiz");
    expect(quiz).toHaveAttribute("data-lesson-id", "1");
    expect(quiz).toHaveAttribute("data-hearts", "3");
    // 1 of 2 completed = 50%
    expect(quiz).toHaveAttribute("data-percentage", "50");
    expect(quiz).toHaveAttribute("data-challenge-count", "2");
  });

  it("passes subscription to Quiz", async () => {
    mockGetLesson.mockResolvedValue(lesson);
    mockGetUserProgress.mockResolvedValue(userProgress);
    mockGetUserSubscription.mockResolvedValue({
      isActive: true,
    });

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    const quiz = screen.getByTestId("quiz");
    expect(quiz).toHaveAttribute("data-has-sub", "true");
  });

  it("calculates 0% when no challenges are completed", async () => {
    const noneCompleted = {
      ...lesson,
      challenges: lesson.challenges.map((c) => ({ ...c, completed: false })),
    };
    mockGetLesson.mockResolvedValue(noneCompleted);
    mockGetUserProgress.mockResolvedValue(userProgress);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByTestId("quiz")).toHaveAttribute("data-percentage", "0");
  });

  it("calculates 100% when all challenges are completed", async () => {
    const allCompleted = {
      ...lesson,
      challenges: lesson.challenges.map((c) => ({ ...c, completed: true })),
    };
    mockGetLesson.mockResolvedValue(allCompleted);
    mockGetUserProgress.mockResolvedValue(userProgress);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByTestId("quiz")).toHaveAttribute("data-percentage", "100");
  });
});
