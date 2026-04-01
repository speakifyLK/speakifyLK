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

vi.mock("../quiz", () => ({
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
  id: 42,
  title: "Lesson 42",
  unitId: 1,
  order: 1,
  challenges: [
    {
      id: 100,
      lessonId: 42,
      type: "SELECT",
      question: "Q1",
      order: 1,
      completed: false,
      challengeOptions: [],
    },
    {
      id: 101,
      lessonId: 42,
      type: "ASSIST",
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
  hearts: 5,
  points: 200,
};

describe("LessonIdPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("redirects to /learn when no lesson found", async () => {
    mockGetLesson.mockResolvedValue(null);
    mockGetUserProgress.mockResolvedValue(userProgress);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    await expect(Page({ params: Promise.resolve({ lessonId: "99" }) })).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(mockRedirect).toHaveBeenCalledWith("/learn");
  });

  it("redirects to /learn when no user progress", async () => {
    mockGetLesson.mockResolvedValue(lesson);
    mockGetUserProgress.mockResolvedValue(null);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    await expect(Page({ params: Promise.resolve({ lessonId: "42" }) })).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(mockRedirect).toHaveBeenCalledWith("/learn");
  });

  it("passes the numeric lessonId to getLesson", async () => {
    mockGetLesson.mockResolvedValue(lesson);
    mockGetUserProgress.mockResolvedValue(userProgress);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page({
      params: Promise.resolve({ lessonId: "42" }),
    });
    render(jsx);

    expect(mockGetLesson).toHaveBeenCalledWith(42);
  });

  it("renders Quiz with correct props", async () => {
    mockGetLesson.mockResolvedValue(lesson);
    mockGetUserProgress.mockResolvedValue(userProgress);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page({
      params: Promise.resolve({ lessonId: "42" }),
    });
    render(jsx);

    const quiz = screen.getByTestId("quiz");
    expect(quiz).toHaveAttribute("data-lesson-id", "42");
    expect(quiz).toHaveAttribute("data-hearts", "5");
    expect(quiz).toHaveAttribute("data-percentage", "0");
    expect(quiz).toHaveAttribute("data-challenge-count", "2");
  });

  it("passes subscription to Quiz", async () => {
    mockGetLesson.mockResolvedValue(lesson);
    mockGetUserProgress.mockResolvedValue(userProgress);
    mockGetUserSubscription.mockResolvedValue({ isActive: true });

    const Page = (await import("./page")).default;
    const jsx = await Page({
      params: Promise.resolve({ lessonId: "42" }),
    });
    render(jsx);

    expect(screen.getByTestId("quiz")).toHaveAttribute("data-has-sub", "true");
  });

  it("calculates correct percentage for partially completed", async () => {
    const partialLesson = {
      ...lesson,
      challenges: [
        { ...lesson.challenges[0], completed: true },
        { ...lesson.challenges[1], completed: false },
      ],
    };
    mockGetLesson.mockResolvedValue(partialLesson);
    mockGetUserProgress.mockResolvedValue(userProgress);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page({
      params: Promise.resolve({ lessonId: "42" }),
    });
    render(jsx);

    expect(screen.getByTestId("quiz")).toHaveAttribute("data-percentage", "50");
  });
});
