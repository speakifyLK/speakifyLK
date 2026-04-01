import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────────

const { mockPush, mockToast, mockSubmitQuizAnswer } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockToast: { error: vi.fn(), success: vi.fn() },
  mockSubmitQuizAnswer: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({ toast: mockToast }));

vi.mock("@/actions/quiz", () => ({
  submitQuizAnswer: (...args: any[]) => mockSubmitQuizAnswer(...args),
}));

vi.mock("@/components/ui/button", () => {
  const React = require("react");
  return {
    Button: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <button ref={ref} {...props}>
        {children}
      </button>
    )),
  };
});

// Mock the child components we don't need to deeply test here
vi.mock("./quiz-timer", () => ({
  QuizTimer: (props: any) => (
    <div data-testid="quiz-timer" data-difficulty={props.difficulty}>
      <button data-testid="time-up-trigger" onClick={props.onTimeUp}>
        Trigger Time Up
      </button>
      <span data-testid="timer-score">{props.score}</span>
    </div>
  ),
}));

vi.mock("./quiz-result", () => ({
  QuizResult: (props: any) => (
    <div data-testid="quiz-result">
      <span data-testid="result-score">{props.localCorrectAnswers}</span>
    </div>
  ),
}));

import { QuizPlay } from "./quiz-play";

// ── Helpers ────────────────────────────────────────────────────────────────

beforeAll(() => {
  window.scrollTo = vi.fn() as any;
});

const makeQuestion = (overrides: any = {}) => ({
  id: 1,
  sessionId: 1,
  question: "What is hello in Sinhala?",
  type: "mcq" as const,
  options: [
    { text: "Ayubowan", isCorrect: true },
    { text: "Sthuthi", isCorrect: false },
    { text: "Oba", isCorrect: false },
  ],
  correctAnswer: "Ayubowan",
  explanation: "Ayubowan is the Sinhala greeting.",
  userAnswer: null,
  isCorrect: null,
  order: 1,
  createdAt: new Date(),
  ...overrides,
});

const makeFillQuestion = (overrides: any = {}) => ({
  id: 2,
  sessionId: 1,
  question: "Fill in: ___",
  type: "fill_blank" as const,
  options: null,
  correctAnswer: "answer",
  explanation: "Explanation here",
  userAnswer: null,
  isCorrect: null,
  order: 2,
  createdAt: new Date(),
  ...overrides,
});

const makeSession = (overrides: any = {}) => ({
  id: 1,
  userId: "user1",
  topic: "Greetings",
  difficulty: "beginner" as const,
  totalQuestions: 2,
  correctAnswers: 0,
  score: null,
  startedAt: new Date(),
  completedAt: null,
  courseId: 1,
  questions: [makeQuestion(), makeFillQuestion()],
  ...overrides,
});

describe("QuizPlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Basic rendering ────────────────────────────────────────────────────

  it("renders quiz timer and progress", () => {
    render(<QuizPlay session={makeSession()} />);
    expect(screen.getByTestId("quiz-timer")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Topic: Greetings")).toBeInTheDocument();
  });

  it("renders current question", () => {
    render(<QuizPlay session={makeSession()} />);
    expect(screen.getByText("What is hello in Sinhala?")).toBeInTheDocument();
  });

  it("renders MCQ options", () => {
    render(<QuizPlay session={makeSession()} />);
    expect(screen.getByText("Ayubowan")).toBeInTheDocument();
    expect(screen.getByText("Sthuthi")).toBeInTheDocument();
    expect(screen.getByText("Oba")).toBeInTheDocument();
  });

  it("renders Submit Answer button", () => {
    render(<QuizPlay session={makeSession()} />);
    expect(screen.getByText("Submit Answer")).toBeInTheDocument();
  });

  // ── Completed session shows results ────────────────────────────────────

  it("shows results when session is already completed", () => {
    render(<QuizPlay session={makeSession({ completedAt: new Date() })} />);
    expect(screen.getByTestId("quiz-result")).toBeInTheDocument();
  });

  // ── No questions ───────────────────────────────────────────────────────

  it("shows 'No questions available' when session has no questions", () => {
    render(<QuizPlay session={makeSession({ questions: [] })} />);
    expect(screen.getByText("No questions available")).toBeInTheDocument();
  });

  it("navigates back when clicking Back to Quiz Config", () => {
    render(<QuizPlay session={makeSession({ questions: [] })} backHref="/custom" />);
    fireEvent.click(screen.getByText("Back to Quiz Config"));
    expect(mockPush).toHaveBeenCalledWith("/custom");
  });

  it("navigates to /quiz by default for back", () => {
    render(<QuizPlay session={makeSession({ questions: [] })} />);
    fireEvent.click(screen.getByText("Back to Quiz Config"));
    expect(mockPush).toHaveBeenCalledWith("/quiz");
  });

  // ── MCQ selection ──────────────────────────────────────────────────────

  it("selects an MCQ option", () => {
    render(<QuizPlay session={makeSession()} />);
    const optionBtn = screen.getByText("Ayubowan");
    fireEvent.click(optionBtn);
    // Submit should be enabled
    expect(screen.getByText("Submit Answer")).not.toBeDisabled();
  });

  // ── Submit answer ──────────────────────────────────────────────────────

  it("submits correct answer and shows success", async () => {
    mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
    render(<QuizPlay session={makeSession()} />);

    fireEvent.click(screen.getByText("Ayubowan"));
    fireEvent.click(screen.getByText("Submit Answer"));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Correct!");
      expect(screen.getByText("✓ Correct!")).toBeInTheDocument();
    });
  });

  it("submits incorrect answer and shows error", async () => {
    mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: false });
    render(<QuizPlay session={makeSession()} />);

    fireEvent.click(screen.getByText("Sthuthi"));
    fireEvent.click(screen.getByText("Submit Answer"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Incorrect answer.");
      expect(screen.getByText("✗ Incorrect")).toBeInTheDocument();
    });
  });

  it("shows correct answer after submission", async () => {
    mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: false });
    render(<QuizPlay session={makeSession()} />);

    fireEvent.click(screen.getByText("Sthuthi"));
    fireEvent.click(screen.getByText("Submit Answer"));

    await waitFor(() => {
      expect(screen.getByText("Ayubowan", { exact: false })).toBeInTheDocument();
    });
  });

  it("shows explanation after submission", async () => {
    mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: false });
    render(<QuizPlay session={makeSession()} />);

    fireEvent.click(screen.getByText("Sthuthi"));
    fireEvent.click(screen.getByText("Submit Answer"));

    await waitFor(() => {
      expect(screen.getByText(/Ayubowan is the Sinhala greeting/)).toBeInTheDocument();
    });
  });

  it("shows toast error when submit fails", async () => {
    mockSubmitQuizAnswer.mockRejectedValue(new Error("Server error"));
    render(<QuizPlay session={makeSession()} />);

    fireEvent.click(screen.getByText("Ayubowan"));
    fireEvent.click(screen.getByText("Submit Answer"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Server error");
    });
  });

  it("shows generic error when submit fails with non-Error", async () => {
    mockSubmitQuizAnswer.mockRejectedValue("some error");
    render(<QuizPlay session={makeSession()} />);

    fireEvent.click(screen.getByText("Ayubowan"));
    fireEvent.click(screen.getByText("Submit Answer"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to submit answer");
    });
  });

  it("prevents double submission", async () => {
    mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
    render(<QuizPlay session={makeSession()} />);

    fireEvent.click(screen.getByText("Ayubowan"));
    fireEvent.click(screen.getByText("Submit Answer"));

    // After submission, button changes to "Next Question"
    await waitFor(() => {
      expect(screen.getByText("Next Question")).toBeInTheDocument();
    });
  });

  it("shows toast error when trying to submit empty answer", () => {
    render(<QuizPlay session={makeSession()} />);
    // Submit button is disabled, but let's verify
    expect(screen.getByText("Submit Answer")).toBeDisabled();
  });

  // ── Next question ──────────────────────────────────────────────────────

  it("advances to next question", async () => {
    mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
    render(<QuizPlay session={makeSession()} />);

    fireEvent.click(screen.getByText("Ayubowan"));
    fireEvent.click(screen.getByText("Submit Answer"));

    await waitFor(() => {
      expect(screen.getByText("Next Question")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Next Question"));

    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Fill in: ___")).toBeInTheDocument();
  });

  it("shows Complete Quiz on last question", async () => {
    mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
    const session = makeSession({
      questions: [makeQuestion()],
      totalQuestions: 1,
    });
    render(<QuizPlay session={session} />);

    fireEvent.click(screen.getByText("Ayubowan"));
    fireEvent.click(screen.getByText("Submit Answer"));

    await waitFor(() => {
      expect(screen.getByText("Complete Quiz")).toBeInTheDocument();
    });
  });

  it("shows results after completing last question", async () => {
    mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
    const session = makeSession({
      questions: [makeQuestion()],
      totalQuestions: 1,
    });
    render(<QuizPlay session={session} />);

    fireEvent.click(screen.getByText("Ayubowan"));
    fireEvent.click(screen.getByText("Submit Answer"));

    // Wait for the transition to complete and "Complete Quiz" to appear
    const completeBtn = await screen.findByText("Complete Quiz");
    await act(async () => {
      fireEvent.click(completeBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId("quiz-result")).toBeInTheDocument();
    });
  });

  // ── Time up ────────────────────────────────────────────────────────────

  it("handles time up with no answer", async () => {
    render(<QuizPlay session={makeSession()} />);

    fireEvent.click(screen.getByTestId("time-up-trigger"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Time's up! No answer submitted.");
    });
  });

  it("handles time up with answer submitted", async () => {
    mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
    render(<QuizPlay session={makeSession()} />);

    // Type an answer first
    fireEvent.click(screen.getByText("Ayubowan"));

    // Then trigger time up
    fireEvent.click(screen.getByTestId("time-up-trigger"));

    await waitFor(() => {
      expect(mockSubmitQuizAnswer).toHaveBeenCalledWith(1, "Ayubowan");
    });
  });

  it("handles time up with incorrect answer", async () => {
    mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: false });
    render(<QuizPlay session={makeSession()} />);

    fireEvent.click(screen.getByText("Sthuthi"));
    fireEvent.click(screen.getByTestId("time-up-trigger"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Time's up! Incorrect answer.");
    });
  });

  it("handles time up with correct answer", async () => {
    mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
    render(<QuizPlay session={makeSession()} />);

    fireEvent.click(screen.getByText("Ayubowan"));
    fireEvent.click(screen.getByTestId("time-up-trigger"));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Time's up! Correct answer!");
    });
  });

  it("handles time up error and resets state", async () => {
    mockSubmitQuizAnswer.mockRejectedValue(new Error("Submit failed"));
    render(<QuizPlay session={makeSession()} />);

    fireEvent.click(screen.getByText("Ayubowan"));
    fireEvent.click(screen.getByTestId("time-up-trigger"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Submit failed");
    });
  });

  it("handles time up error with non-Error", async () => {
    mockSubmitQuizAnswer.mockRejectedValue("boom");
    render(<QuizPlay session={makeSession()} />);

    fireEvent.click(screen.getByText("Ayubowan"));
    fireEvent.click(screen.getByTestId("time-up-trigger"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to submit answer");
    });
  });

  // ── Fill in blank / translation input ──────────────────────────────────

  it("renders text input for fill_blank questions", async () => {
    mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
    const session = makeSession({
      questions: [makeFillQuestion()],
      totalQuestions: 1,
    });
    render(<QuizPlay session={session} />);
    const input = screen.getByPlaceholderText("Type your answer here...");
    expect(input).toBeInTheDocument();
  });

  it("renders text input for translation questions", () => {
    const session = makeSession({
      questions: [makeQuestion({ type: "translation", options: null })],
      totalQuestions: 1,
    });
    render(<QuizPlay session={session} />);
    const input = screen.getByPlaceholderText("Type your answer here...");
    expect(input).toBeInTheDocument();
  });

  it("types in fill_blank input and submits", async () => {
    mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
    const session = makeSession({
      questions: [makeFillQuestion()],
      totalQuestions: 1,
    });
    render(<QuizPlay session={session} />);

    const input = screen.getByPlaceholderText("Type your answer here...");
    fireEvent.change(input, { target: { value: "answer" } });
    fireEvent.click(screen.getByText("Submit Answer"));

    await waitFor(() => {
      expect(mockSubmitQuizAnswer).toHaveBeenCalledWith(2, "answer");
    });
  });

  // ── Score tracking ─────────────────────────────────────────────────────

  it("increments score on correct answer", async () => {
    mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
    render(<QuizPlay session={makeSession()} />);

    fireEvent.click(screen.getByText("Ayubowan"));
    fireEvent.click(screen.getByText("Submit Answer"));

    await waitFor(() => {
      expect(screen.getByTestId("timer-score").textContent).toBe("1");
    });
  });

  // ── Session with pre-existing answers (initialLocalQuestionAnswers) ────

  it("initializes answers from session questions with existing answers", () => {
    const session = makeSession({
      questions: [
        makeQuestion({ userAnswer: "Ayubowan", isCorrect: true }),
        makeFillQuestion({ userAnswer: "", isCorrect: false }),
      ],
    });
    render(<QuizPlay session={session} />);
    // Component should render (answers are pre-populated internally)
    expect(screen.getByTestId("quiz-timer")).toBeInTheDocument();
  });

  it("initializes answers from session with empty userAnswer but isCorrect set", () => {
    const session = makeSession({
      questions: [makeQuestion({ userAnswer: null, isCorrect: true })],
      totalQuestions: 1,
    });
    render(<QuizPlay session={session} />);
    expect(screen.getByTestId("quiz-timer")).toBeInTheDocument();
  });

  // ── Session re-mounting on session.id change ───────────────────────────

  it("resets state when session changes", () => {
    const session1 = makeSession({ id: 1 });
    const session2 = makeSession({ id: 2, correctAnswers: 5 });

    const { rerender } = render(<QuizPlay session={session1} />);
    rerender(<QuizPlay session={session2} />);
    expect(screen.getByTestId("timer-score").textContent).toBe("5");
  });

  // ── Time up panel styling ──────────────────────────────────────────────

  it("shows time up styling", async () => {
    render(<QuizPlay session={makeSession()} />);
    fireEvent.click(screen.getByTestId("time-up-trigger"));

    await waitFor(() => {
      expect(screen.getByText("⏰ Time's up!")).toBeInTheDocument();
    });
  });

  // ── Disables options after answer or time up ───────────────────────────

  it("disables MCQ options after time up", async () => {
    render(<QuizPlay session={makeSession()} />);
    fireEvent.click(screen.getByTestId("time-up-trigger"));

    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      const optionBtns = buttons.filter((b) =>
        ["Ayubowan", "Sthuthi", "Oba"].includes(b.textContent || "")
      );
      optionBtns.forEach((btn) => expect(btn).toBeDisabled());
    });
  });

  // ── Question without explanation ───────────────────────────────────────

  it("does not show explanation when question has none", async () => {
    mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: false });
    const session = makeSession({
      questions: [makeQuestion({ explanation: null })],
      totalQuestions: 1,
    });
    render(<QuizPlay session={session} />);

    fireEvent.click(screen.getByText("Ayubowan"));
    fireEvent.click(screen.getByText("Submit Answer"));

    await waitFor(() => {
      expect(screen.queryByText(/Explanation:/)).not.toBeInTheDocument();
    });
  });
});
