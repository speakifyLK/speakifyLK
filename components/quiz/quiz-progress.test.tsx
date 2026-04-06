import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";

import { useQuizStore } from "@/store/quiz-store";

import { QuizProgress } from "./quiz-progress";

vi.mock("react-circular-progressbar", () => ({
  buildStyles: (s: unknown) => s,
  CircularProgressbar: ({ value, text }: { value: number; text: string }) => (
    <div data-testid="circular-progress" data-value={String(value)} data-text={text} />
  ),
}));

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value }: { value: number }) => (
    <div data-testid="linear-progress" data-value={String(value)} role="progressbar" />
  ),
}));

describe("QuizProgress", () => {
  beforeEach(() => {
    useQuizStore.getState().resetQuiz();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders score and question index for total questions", () => {
    render(
      <QuizProgress
        difficulty="beginner"
        currentQuestionIndex={2}
        totalQuestions={5}
        score={3}
        isAnswerSubmitted={false}
      />
    );
    expect(screen.getByText("3/5")).toBeInTheDocument();
    expect(screen.getByText("Question 3 of 5")).toBeInTheDocument();
  });

  it("uses beginner time limit (30s) for the circular bar", () => {
    render(
      <QuizProgress
        difficulty="beginner"
        currentQuestionIndex={0}
        totalQuestions={1}
        score={0}
        isAnswerSubmitted={false}
      />
    );
    const c = screen.getByTestId("circular-progress");
    expect(c.getAttribute("data-text")).toBe("30s");
    expect(Number(c.getAttribute("data-value"))).toBeCloseTo(100, 0);
  });

  it("uses intermediate and advanced time limits", () => {
    const { unmount } = render(
      <QuizProgress
        difficulty="intermediate"
        currentQuestionIndex={0}
        totalQuestions={1}
        score={0}
        isAnswerSubmitted={false}
      />
    );
    expect(screen.getByTestId("circular-progress").getAttribute("data-text")).toBe("20s");
    unmount();
    useQuizStore.getState().resetQuiz();
    render(
      <QuizProgress
        difficulty="advanced"
        currentQuestionIndex={0}
        totalQuestions={1}
        score={0}
        isAnswerSubmitted={false}
      />
    );
    expect(screen.getByTestId("circular-progress").getAttribute("data-text")).toBe("15s");
  });

  it("maps timer colour to green, yellow, and red bands via path percentage", () => {
    const { unmount } = render(
      <QuizProgress
        difficulty="beginner"
        currentQuestionIndex={0}
        totalQuestions={1}
        score={0}
        isAnswerSubmitted={false}
      />
    );
    act(() => {
      useQuizStore.setState({ timeRemaining: 20, isQuizActive: true });
    });
    expect(Number(screen.getByTestId("circular-progress").getAttribute("data-value"))).toBeCloseTo(
      (20 / 30) * 100,
      5
    );

    act(() => {
      useQuizStore.setState({ timeRemaining: 8, isQuizActive: true });
    });
    expect(Number(screen.getByTestId("circular-progress").getAttribute("data-value"))).toBeCloseTo(
      (8 / 30) * 100,
      5
    );

    act(() => {
      useQuizStore.setState({ timeRemaining: 5, isQuizActive: true });
    });
    expect(Number(screen.getByTestId("circular-progress").getAttribute("data-value"))).toBeCloseTo(
      (5 / 30) * 100,
      5
    );

    unmount();
  });

  it("derives linear question progress from index and total", () => {
    render(
      <QuizProgress
        difficulty="beginner"
        currentQuestionIndex={0}
        totalQuestions={4}
        score={0}
        isAnswerSubmitted={false}
      />
    );
    expect(Number(screen.getByTestId("linear-progress").getAttribute("data-value"))).toBe(25);
  });

  it("fires onTimeUp after the store timer counts down to zero", () => {
    vi.useFakeTimers();
    const onTimeUp = vi.fn();
    render(
      <QuizProgress
        difficulty="advanced"
        currentQuestionIndex={0}
        totalQuestions={1}
        score={0}
        isAnswerSubmitted={false}
        onTimeUp={onTimeUp}
      />
    );

    act(() => {
      vi.advanceTimersByTime(15_000);
    });

    expect(onTimeUp).toHaveBeenCalledTimes(1);
  });

  it("does not fire onTimeUp when the answer was already submitted", () => {
    vi.useFakeTimers();
    const onTimeUp = vi.fn();
    render(
      <QuizProgress
        difficulty="advanced"
        currentQuestionIndex={0}
        totalQuestions={1}
        score={0}
        isAnswerSubmitted={true}
        onTimeUp={onTimeUp}
      />
    );

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(onTimeUp).not.toHaveBeenCalled();
  });

  it("does not throw when onTimeUp is omitted and time runs out", () => {
    vi.useFakeTimers();
    render(
      <QuizProgress
        difficulty="advanced"
        currentQuestionIndex={0}
        totalQuestions={1}
        score={0}
        isAnswerSubmitted={false}
      />
    );

    expect(() => {
      act(() => {
        vi.advanceTimersByTime(15_000);
      });
    }).not.toThrow();
  });

  it("treats unknown difficulty as zero second limit for percentage math", () => {
    render(
      <QuizProgress
        difficulty={"not-a-level" as unknown as "beginner"}
        currentQuestionIndex={0}
        totalQuestions={1}
        score={0}
        isAnswerSubmitted={false}
      />
    );
    const c = screen.getByTestId("circular-progress");
    expect(Number(c.getAttribute("data-value"))).toBe(0);
    expect(c.getAttribute("data-text")).toBe("undefineds");
  });

  it("resets the store timer when the question index changes", () => {
    const { rerender } = render(
      <QuizProgress
        difficulty="beginner"
        currentQuestionIndex={0}
        totalQuestions={2}
        score={0}
        isAnswerSubmitted={false}
      />
    );
    expect(useQuizStore.getState().timeRemaining).toBe(30);

    act(() => {
      useQuizStore.setState({ timeRemaining: 5 });
    });
    expect(useQuizStore.getState().timeRemaining).toBe(5);

    rerender(
      <QuizProgress
        difficulty="beginner"
        currentQuestionIndex={1}
        totalQuestions={2}
        score={0}
        isAnswerSubmitted={false}
      />
    );
    expect(useQuizStore.getState().timeRemaining).toBe(30);
  });
});
