import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { render, screen, act } from "@testing-library/react";

import { QuizTimer } from "./quiz-timer";

describe("QuizTimer", () => {
  beforeAll(() => {
    // jsdom doesn't have scrollTo
    window.scrollTo = vi.fn() as any;
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultProps = {
    difficulty: "beginner" as const,
    score: 3,
    totalQuestions: 10,
    isAnswerSubmitted: false,
  };

  it("renders with beginner time limit (30s)", () => {
    render(<QuizTimer {...defaultProps} />);
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("renders with intermediate time limit (20s)", () => {
    render(<QuizTimer {...defaultProps} difficulty="intermediate" />);
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("renders with advanced time limit (15s)", () => {
    render(<QuizTimer {...defaultProps} difficulty="advanced" />);
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("displays score", () => {
    render(<QuizTimer {...defaultProps} score={5} totalQuestions={10} />);
    expect(screen.getByText("5/10")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();
  });

  it("counts down every second", () => {
    render(<QuizTimer {...defaultProps} />);
    expect(screen.getByText("30")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("29")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("28")).toBeInTheDocument();
  });

  it("stops counting at 0 and calls onTimeUp", () => {
    const onTimeUp = vi.fn();
    render(<QuizTimer {...defaultProps} difficulty="advanced" onTimeUp={onTimeUp} />);
    // advanced = 15s
    expect(screen.getByText("15")).toBeInTheDocument();

    // Advance 15 seconds to reach 0
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(onTimeUp).toHaveBeenCalled();
  });

  it("stops timer when isAnswerSubmitted is true", () => {
    const { rerender } = render(<QuizTimer {...defaultProps} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText("27")).toBeInTheDocument();

    // Submit answer - timer should stop
    rerender(<QuizTimer {...defaultProps} isAnswerSubmitted={true} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // Should still be 27
    expect(screen.getByText("27")).toBeInTheDocument();
  });

  it("resets timer when resetKey changes", () => {
    const { rerender } = render(<QuizTimer {...defaultProps} resetKey={0} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText("25")).toBeInTheDocument();

    // Change resetKey to trigger reset
    rerender(<QuizTimer {...defaultProps} resetKey={1} />);
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("shows green color when > 50% time remaining", () => {
    render(<QuizTimer {...defaultProps} />);
    // 30/30 = 100% > 50%
    const timerText = screen.getByText("30");
    expect(timerText.className).toContain("text-green-500");
  });

  it("shows yellow color when 25-50% time remaining", () => {
    render(<QuizTimer {...defaultProps} />);
    // Advance to leave ~10s = 10/30 = 33%
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    const timerText = screen.getByText("10");
    expect(timerText.className).toContain("text-yellow-500");
  });

  it("shows red color when < 25% time remaining", () => {
    render(<QuizTimer {...defaultProps} />);
    // Advance to leave ~5s = 5/30 = 16.6%
    act(() => {
      vi.advanceTimersByTime(25000);
    });
    const timerText = screen.getByText("5");
    expect(timerText.className).toContain("text-red-500");
  });

  it("renders SVG circles with correct stroke colors", () => {
    const { container } = render(<QuizTimer {...defaultProps} />);
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
    // Progress circle should be green (#22c55e) at full time
    expect(circles[1].getAttribute("stroke")).toBe("#22c55e");
  });

  it("SVG progress circle shows yellow stroke at 25-50%", () => {
    const { container } = render(<QuizTimer {...defaultProps} />);
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    const circles = container.querySelectorAll("circle");
    expect(circles[1].getAttribute("stroke")).toBe("#eab308");
  });

  it("SVG progress circle shows red stroke at < 25%", () => {
    const { container } = render(<QuizTimer {...defaultProps} />);
    act(() => {
      vi.advanceTimersByTime(25000);
    });
    const circles = container.querySelectorAll("circle");
    expect(circles[1].getAttribute("stroke")).toBe("#ef4444");
  });

  it("uses default resetKey of 0", () => {
    render(<QuizTimer {...defaultProps} />);
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("updates onTimeUp ref when prop changes", () => {
    const onTimeUp1 = vi.fn();
    const onTimeUp2 = vi.fn();
    const { rerender } = render(
      <QuizTimer {...defaultProps} difficulty="advanced" onTimeUp={onTimeUp1} />
    );
    // Switch the callback
    rerender(<QuizTimer {...defaultProps} difficulty="advanced" onTimeUp={onTimeUp2} />);
    // Let timer expire (15s for advanced)
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(onTimeUp1).not.toHaveBeenCalled();
    expect(onTimeUp2).toHaveBeenCalled();
  });
});
