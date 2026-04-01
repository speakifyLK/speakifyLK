import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────────

const { mockPush, mockRefresh, mockToast, mockCompleteQuizSession } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
  mockToast: { error: vi.fn(), success: vi.fn() },
  mockCompleteQuizSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("sonner", () => ({ toast: mockToast }));

vi.mock("@/actions/quiz", () => ({
  completeQuizSession: (...args: any[]) => mockCompleteQuizSession(...args),
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

vi.mock("react-confetti", () => ({
  default: (_props: any) => <div data-testid="confetti" />,
}));

vi.mock("react-use", () => ({
  useWindowSize: () => ({ width: 1024, height: 768 }),
}));

vi.mock("react-circular-progressbar", () => ({
  CircularProgressbar: (props: any) => (
    <div data-testid="progressbar" data-value={props.value}>
      {props.text}
    </div>
  ),
  buildStyles: (opts: any) => opts,
}));

vi.mock("lucide-react", () => ({
  Sparkles: (props: any) => <span data-testid="sparkles" {...props} />,
}));

import { QuizResult } from "./quiz-result";

// ── Helpers ────────────────────────────────────────────────────────────────

beforeAll(() => {
  window.scrollTo = vi.fn() as any;
});

const makeQuestion = (overrides: any = {}) => ({
  id: 1,
  sessionId: 1,
  question: "What is hello?",
  type: "mcq" as const,
  options: [],
  correctAnswer: "Ayubowan",
  explanation: "Greeting in Sinhala",
  userAnswer: "Ayubowan",
  isCorrect: true,
  order: 1,
  createdAt: new Date(),
  ...overrides,
});

const makeSession = (overrides: any = {}) => ({
  id: 1,
  userId: "user1",
  topic: "Greetings",
  difficulty: "beginner" as const,
  totalQuestions: 5,
  correctAnswers: 4,
  score: 80,
  startedAt: new Date("2025-01-01T10:00:00Z"),
  completedAt: new Date("2025-01-01T10:05:00Z"),
  courseId: 1,
  questions: [
    makeQuestion(),
    makeQuestion({
      id: 2,
      question: "What is goodbye?",
      correctAnswer: "Gihin ennam",
      userAnswer: "Wrong",
      isCorrect: false,
      explanation: null,
    }),
  ],
  ...overrides,
});

describe("QuizResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockCompleteQuizSession.mockResolvedValue({ xpAwarded: 20 });
    // Default: provide clipboard
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Basic rendering ────────────────────────────────────────────────────

  it("renders quiz completed heading", () => {
    render(<QuizResult session={makeSession()} />);
    expect(screen.getByText("Quiz Completed 🎉")).toBeInTheDocument();
  });

  it("renders topic and difficulty", () => {
    render(<QuizResult session={makeSession()} />);
    // Topic and difficulty appear in a single line: "Topic: Greetings · beginner"
    expect(screen.getByText("Greetings")).toBeInTheDocument();
    // "beginner" appears twice (topic line + stats row), so use getAllByText
    const beginnerEls = screen.getAllByText("beginner");
    expect(beginnerEls.length).toBeGreaterThanOrEqual(1);
  });

  it("renders score percentage", () => {
    render(<QuizResult session={makeSession()} />);
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("renders grade", () => {
    render(<QuizResult session={makeSession()} />);
    expect(screen.getByText("Grade B")).toBeInTheDocument();
  });

  it("renders correct answers count", () => {
    render(<QuizResult session={makeSession()} />);
    expect(screen.getByText("4 / 5 correct answers")).toBeInTheDocument();
  });

  it("renders stats row", () => {
    render(<QuizResult session={makeSession()} />);
    expect(screen.getByText("Questions")).toBeInTheDocument();
    // "Correct" appears in both the stats row label and question review badges
    expect(screen.getAllByText("Correct").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Time taken")).toBeInTheDocument();
    expect(screen.getByText("Difficulty")).toBeInTheDocument();
  });

  it("renders time taken label", () => {
    render(<QuizResult session={makeSession()} />);
    expect(screen.getByText("5m 0s")).toBeInTheDocument();
  });

  it("renders question review section", () => {
    render(<QuizResult session={makeSession()} />);
    expect(screen.getByText("Question review")).toBeInTheDocument();
    expect(screen.getByText(/What is hello/)).toBeInTheDocument();
    expect(screen.getByText(/What is goodbye/)).toBeInTheDocument();
  });

  it("renders action buttons", () => {
    render(<QuizResult session={makeSession()} />);
    expect(screen.getByText("Try Again")).toBeInTheDocument();
    expect(screen.getByText("New Quiz")).toBeInTheDocument();
    expect(screen.getByText("Share Results")).toBeInTheDocument();
  });

  // ── Grade calculations ─────────────────────────────────────────────────

  it("renders grade A for >=90%", () => {
    render(
      <QuizResult
        session={makeSession({ totalQuestions: 10, correctAnswers: 9 })}
        localCorrectAnswers={9}
      />
    );
    expect(screen.getByText("Grade A")).toBeInTheDocument();
  });

  it("renders grade C for >=70%", () => {
    render(
      <QuizResult
        session={makeSession({ totalQuestions: 10, correctAnswers: 7 })}
        localCorrectAnswers={7}
      />
    );
    expect(screen.getByText("Grade C")).toBeInTheDocument();
  });

  it("renders grade D for >=60%", () => {
    render(
      <QuizResult
        session={makeSession({ totalQuestions: 10, correctAnswers: 6 })}
        localCorrectAnswers={6}
      />
    );
    expect(screen.getByText("Grade D")).toBeInTheDocument();
  });

  it("renders grade F for <60%", () => {
    render(
      <QuizResult
        session={makeSession({ totalQuestions: 10, correctAnswers: 2 })}
        localCorrectAnswers={2}
      />
    );
    expect(screen.getByText("Grade F")).toBeInTheDocument();
  });

  // ── Badge color ────────────────────────────────────────────────────────

  it("uses emerald badge for score >= 80", () => {
    render(
      <QuizResult
        session={makeSession({ totalQuestions: 10, correctAnswers: 9 })}
        localCorrectAnswers={9}
      />
    );
    const badge = screen.getByText(/Grade A/);
    expect(badge.className).toContain("emerald");
  });

  it("uses amber badge for score >= 50", () => {
    render(
      <QuizResult
        session={makeSession({ totalQuestions: 10, correctAnswers: 5 })}
        localCorrectAnswers={5}
      />
    );
    const badge = screen.getByText(/Grade/);
    expect(badge.className).toContain("amber");
  });

  it("uses rose badge for score < 50", () => {
    render(
      <QuizResult
        session={makeSession({ totalQuestions: 10, correctAnswers: 2 })}
        localCorrectAnswers={2}
      />
    );
    const badge = screen.getByText(/Grade F/);
    expect(badge.className).toContain("rose");
  });

  // ── Confetti ───────────────────────────────────────────────────────────

  it("shows confetti for scores >= 80%", () => {
    render(
      <QuizResult
        session={makeSession({ totalQuestions: 10, correctAnswers: 9 })}
        localCorrectAnswers={9}
      />
    );
    expect(screen.getByTestId("confetti")).toBeInTheDocument();
  });

  it("does not show confetti for scores < 80%", () => {
    render(
      <QuizResult
        session={makeSession({ totalQuestions: 10, correctAnswers: 3 })}
        localCorrectAnswers={3}
      />
    );
    expect(screen.queryByTestId("confetti")).not.toBeInTheDocument();
  });

  // ── Time label edge cases ──────────────────────────────────────────────

  it("shows '—' when no timestamps", () => {
    render(<QuizResult session={makeSession({ startedAt: null, completedAt: null })} />);
    // Multiple "—" might appear, just check one exists
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("shows seconds only when duration < 60s", () => {
    const startedAt = new Date("2025-01-01T10:00:00Z");
    const completedAt = new Date("2025-01-01T10:00:30Z");
    render(<QuizResult session={makeSession({ startedAt, completedAt })} />);
    expect(screen.getByText("30s")).toBeInTheDocument();
  });

  it("shows '—' when completedAt <= startedAt", () => {
    const startedAt = new Date("2025-01-01T10:00:00Z");
    const completedAt = new Date("2025-01-01T09:00:00Z");
    render(<QuizResult session={makeSession({ startedAt, completedAt })} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("handles string dates", () => {
    render(
      <QuizResult
        session={makeSession({
          startedAt: "2025-01-01T10:00:00Z",
          completedAt: "2025-01-01T10:02:30Z",
        })}
      />
    );
    expect(screen.getByText("2m 30s")).toBeInTheDocument();
  });

  it("handles invalid date strings", () => {
    render(
      <QuizResult
        session={makeSession({
          startedAt: "invalid-date",
          completedAt: "also-invalid",
        })}
      />
    );
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  // ── Session completion ─────────────────────────────────────────────────

  it("calls completeQuizSession on mount when not completed", async () => {
    render(<QuizResult session={makeSession({ completedAt: null })} />);

    await waitFor(() => {
      expect(mockCompleteQuizSession).toHaveBeenCalledWith(1);
    });
  });

  it("shows XP toast on successful completion", async () => {
    mockCompleteQuizSession.mockResolvedValue({ xpAwarded: 20 });
    render(<QuizResult session={makeSession({ completedAt: null })} />);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("+20 XP from AI Quiz!", expect.any(Object));
    });
  });

  it("does not show XP toast when xpAwarded is 0", async () => {
    mockCompleteQuizSession.mockResolvedValue({ xpAwarded: 0 });
    render(<QuizResult session={makeSession({ completedAt: null })} />);

    await waitFor(() => {
      expect(mockCompleteQuizSession).toHaveBeenCalled();
    });
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it("does not call completeQuizSession when already completed", () => {
    render(<QuizResult session={makeSession()} />);
    expect(mockCompleteQuizSession).not.toHaveBeenCalled();
  });

  it("shows error toast when completion fails", async () => {
    mockCompleteQuizSession.mockRejectedValue(new Error("Server down"));
    render(<QuizResult session={makeSession({ completedAt: null })} />);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Server down");
    });
  });

  it("ignores 'already completed' errors", async () => {
    mockCompleteQuizSession.mockRejectedValue(new Error("Session already completed"));
    render(<QuizResult session={makeSession({ completedAt: null })} />);

    await waitFor(() => {
      expect(mockCompleteQuizSession).toHaveBeenCalled();
    });
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  it("handles non-Error completion failures", async () => {
    mockCompleteQuizSession.mockRejectedValue("boom");
    render(<QuizResult session={makeSession({ completedAt: null })} />);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to finalise quiz session.");
    });
  });

  it("does not call completeQuizSession when session.id is 0/falsy", () => {
    render(<QuizResult session={makeSession({ id: 0, completedAt: null })} />);
    expect(mockCompleteQuizSession).not.toHaveBeenCalled();
  });

  // ── Try Again ──────────────────────────────────────────────────────────

  it("handles Try Again success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessionId: 42 }),
    });
    global.fetch = mockFetch;

    render(<QuizResult session={makeSession()} />);
    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("New quiz ready!");
      expect(mockPush).toHaveBeenCalledWith("/quiz?sessionId=42");
    });
  });

  it("handles Try Again with custom backHref", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessionId: 42 }),
    });
    global.fetch = mockFetch;

    render(<QuizResult session={makeSession()} backHref="/custom" />);
    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/custom?sessionId=42");
    });
  });

  it("handles Try Again API failure", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Gen failed" }),
    });
    global.fetch = mockFetch;

    render(<QuizResult session={makeSession()} />);
    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Gen failed");
    });
  });

  it("handles Try Again API failure without error field", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });
    global.fetch = mockFetch;

    render(<QuizResult session={makeSession()} />);
    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to generate quiz");
    });
  });

  it("handles Try Again API failure with json parse error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error("parse error")),
    });
    global.fetch = mockFetch;

    render(<QuizResult session={makeSession()} />);
    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to generate quiz");
    });
  });

  it("handles Try Again missing sessionId", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    global.fetch = mockFetch;

    render(<QuizResult session={makeSession()} />);
    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to start quiz: missing session ID");
    });
  });

  it("handles Try Again with string sessionId", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessionId: "99" }),
    });
    global.fetch = mockFetch;

    render(<QuizResult session={makeSession()} />);
    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/quiz?sessionId=99");
    });
  });

  it("handles Try Again fetch exception", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    global.fetch = mockFetch;

    render(<QuizResult session={makeSession()} />);
    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Network error");
    });
  });

  it("handles Try Again non-Error exception", async () => {
    const mockFetch = vi.fn().mockRejectedValue("boom");
    global.fetch = mockFetch;

    render(<QuizResult session={makeSession()} />);
    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to start quiz");
    });
  });

  // ── New Quiz ───────────────────────────────────────────────────────────

  it("navigates to quiz page on New Quiz click", () => {
    render(<QuizResult session={makeSession()} />);
    fireEvent.click(screen.getByText("New Quiz"));
    expect(mockPush).toHaveBeenCalledWith("/quiz");
  });

  it("navigates to custom backHref on New Quiz click", () => {
    render(<QuizResult session={makeSession()} backHref="/custom" />);
    fireEvent.click(screen.getByText("New Quiz"));
    expect(mockPush).toHaveBeenCalledWith("/custom");
  });

  // ── Share Results ──────────────────────────────────────────────────────

  it("copies results to clipboard", async () => {
    render(<QuizResult session={makeSession()} />);
    fireEvent.click(screen.getByText("Share Results"));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith("Results copied to clipboard!");
    });
  });

  it("shows Copied! text after sharing", async () => {
    render(<QuizResult session={makeSession()} />);
    fireEvent.click(screen.getByText("Share Results"));

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("resets Copied! text after timeout", async () => {
    render(<QuizResult session={makeSession()} />);
    fireEvent.click(screen.getByText("Share Results"));

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });

    vi.advanceTimersByTime(2500);

    await waitFor(() => {
      expect(screen.getByText("Share Results")).toBeInTheDocument();
    });
  });

  it("shows error when clipboard fails", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) },
    });

    render(<QuizResult session={makeSession()} />);
    fireEvent.click(screen.getByText("Share Results"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Unable to copy to clipboard.");
    });
  });

  // ── Question review with localQuestionAnswers ──────────────────────────

  it("uses localQuestionAnswers for review when provided", () => {
    const localAnswers = {
      1: { userAnswer: "Local answer", isCorrect: true },
      2: { userAnswer: "Local wrong", isCorrect: false },
    };

    render(<QuizResult session={makeSession()} localQuestionAnswers={localAnswers} />);
    expect(screen.getByText("Local answer")).toBeInTheDocument();
    expect(screen.getByText("Local wrong")).toBeInTheDocument();
  });

  it("falls back to session data when no local answers", () => {
    render(<QuizResult session={makeSession()} />);
    // "Ayubowan" appears as both "Your answer" and "Correct answer" for question 1
    const ayubowanEls = screen.getAllByText("Ayubowan");
    expect(ayubowanEls.length).toBeGreaterThanOrEqual(1);
  });

  it("shows 'No answer' for questions without userAnswer", () => {
    const session = makeSession({
      questions: [makeQuestion({ userAnswer: null, isCorrect: false })],
    });
    render(<QuizResult session={session} />);
    expect(screen.getByText("No answer")).toBeInTheDocument();
  });

  it("shows no questions message when session has no questions", () => {
    render(<QuizResult session={makeSession({ questions: [] })} />);
    expect(screen.getByText("No questions found for this session.")).toBeInTheDocument();
  });

  it("shows explanation when question has one", () => {
    render(<QuizResult session={makeSession()} />);
    expect(screen.getByText(/Greeting in Sinhala/)).toBeInTheDocument();
  });

  it("does not show explanation when question has none", () => {
    const session = makeSession({
      questions: [makeQuestion({ explanation: null })],
    });
    render(<QuizResult session={session} />);
    expect(screen.queryByText(/Explanation:/)).not.toBeInTheDocument();
  });

  // ── localCorrectAnswers override ───────────────────────────────────────

  it("uses localCorrectAnswers when provided", () => {
    render(<QuizResult session={makeSession()} localCorrectAnswers={3} />);
    expect(screen.getByText("3 / 5 correct answers")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  // ── 0 totalQuestions edge case ─────────────────────────────────────────

  it("handles zero total questions", () => {
    render(
      <QuizResult
        session={makeSession({ totalQuestions: 0, questions: [] })}
        localCorrectAnswers={0}
      />
    );
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  // ── clampQuestionCountForApi edge cases ────────────────────────────────

  it("clamps question count for retry (uses session.questions.length as fallback)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessionId: 42 }),
    });
    global.fetch = mockFetch;

    render(<QuizResult session={makeSession({ totalQuestions: 0 })} />);
    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.questionCount).toBeGreaterThanOrEqual(5);
      expect(body.questionCount).toBeLessThanOrEqual(15);
    });
  });

  // ── questionTypesForRetry ──────────────────────────────────────────────

  it("sends correct question types based on session questions", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessionId: 42 }),
    });
    global.fetch = mockFetch;

    render(<QuizResult session={makeSession()} />);
    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.questionTypes).toContain("mcq");
    });
  });

  // ── parseSessionIdFromGenerateResponse edge ────────────────────────────

  it("handles non-numeric string sessionId", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sessionId: "abc" }),
    });
    global.fetch = mockFetch;

    render(<QuizResult session={makeSession()} />);
    fireEvent.click(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to start quiz: missing session ID");
    });
  });

  // ── Double share click clears previous timeout ─────────────────────────

  it("clears previous copy timeout on double share click", async () => {
    render(<QuizResult session={makeSession()} />);
    fireEvent.click(screen.getByText("Share Results"));

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });

    // Click again before timeout
    fireEvent.click(screen.getByText("Copied!"));

    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  // ── totalQuestions fallback ────────────────────────────────────────────

  it("uses '—' when totalQuestions is 0", () => {
    render(
      <QuizResult
        session={makeSession({ totalQuestions: 0, questions: [] })}
        localCorrectAnswers={0}
      />
    );
    // The stats row shows "—" for totalQuestions when it's 0
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  // ── correctAnswers from session fallback ───────────────────────────────

  it("falls back to session.correctAnswers when no localCorrectAnswers", () => {
    render(<QuizResult session={makeSession({ correctAnswers: 3 })} />);
    expect(screen.getByText("3 / 5 correct answers")).toBeInTheDocument();
  });

  it("uses 0 when both localCorrectAnswers and session.correctAnswers are null", () => {
    render(<QuizResult session={makeSession({ correctAnswers: null })} />);
    expect(screen.getByText("0 / 5 correct answers")).toBeInTheDocument();
  });
});
