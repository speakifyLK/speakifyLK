import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────────

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

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open, onOpenChange }: any) =>
    open ? (
      <div data-testid="dialog" data-open={open}>
        {children}
        <button data-testid="dialog-close-trigger" onClick={() => onOpenChange(false)}>
          trigger close
        </button>
      </div>
    ) : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, ...props }: any) => (
    <div data-testid="scroll-area" {...props}>
      {children}
    </div>
  ),
}));

vi.mock("date-fns", () => ({
  format: (date: any, _fmt: string) => {
    const d = new Date(date);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  },
}));

import { QuizHistory } from "./quiz-history";

// ── Helpers ────────────────────────────────────────────────────────────────

beforeAll(() => {
  window.scrollTo = vi.fn() as any;
});

const makeHistory = (overrides: any[] = []): any[] => [
  {
    id: 1,
    topic: "Greetings",
    difficulty: "beginner",
    score: 90,
    totalQuestions: 10,
    correctAnswers: 9,
    startedAt: new Date("2025-01-15T10:00:00Z"),
  },
  {
    id: 2,
    topic: "Numbers",
    difficulty: "intermediate",
    score: 60,
    totalQuestions: 10,
    correctAnswers: 6,
    startedAt: new Date("2025-01-14T10:00:00Z"),
  },
  {
    id: 3,
    topic: "Colors",
    difficulty: "advanced",
    score: null,
    totalQuestions: 10,
    correctAnswers: 3,
    startedAt: null,
  },
  ...overrides,
];

const makeStats = (overrides: any = {}): any => ({
  totalQuizzes: 10,
  averageScore: 75.5,
  favouriteTopic: "Greetings",
  improvementTrend: "improving" as const,
  quizStreak: 5,
  ...overrides,
});

/** Find the history-list button for a given topic (avoids ambiguity with stats). */
const clickHistoryItem = (topic: string) => {
  const els = screen.getAllByText(topic);
  const btn = els.map((el) => el.closest("button")).find((b) => b !== null)!;
  fireEvent.click(btn);
};

describe("QuizHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Basic rendering ────────────────────────────────────────────────────

  it("renders the heading", () => {
    render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
    expect(screen.getByText("Your quiz performance")).toBeInTheDocument();
  });

  it("renders stats summary", () => {
    render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
    expect(screen.getByText("Total quizzes")).toBeInTheDocument();
    expect(screen.getByText("Average score")).toBeInTheDocument();
    expect(screen.getByText("Favourite topic")).toBeInTheDocument();
    // "Greetings" appears in both stats and history list
    expect(screen.getAllByText("Greetings").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Streak")).toBeInTheDocument();
    expect(screen.getByText("Trend")).toBeInTheDocument();
    expect(screen.getByText("Improving")).toBeInTheDocument();
  });

  it("renders streak with correct pluralization (days)", () => {
    render(<QuizHistory history={makeHistory()} stats={makeStats({ quizStreak: 5 })} />);
    expect(screen.getByText("days")).toBeInTheDocument();
  });

  it("renders streak with singular (day)", () => {
    render(<QuizHistory history={makeHistory()} stats={makeStats({ quizStreak: 1 })} />);
    expect(screen.getByText("day")).toBeInTheDocument();
  });

  it("renders 'Declining' trend label", () => {
    render(
      <QuizHistory history={makeHistory()} stats={makeStats({ improvementTrend: "declining" })} />
    );
    expect(screen.getByText("Declining")).toBeInTheDocument();
  });

  it("renders 'Stable' trend label", () => {
    render(
      <QuizHistory history={makeHistory()} stats={makeStats({ improvementTrend: "stable" })} />
    );
    expect(screen.getByText("Stable")).toBeInTheDocument();
  });

  it("renders '—' when favourite topic is null", () => {
    render(<QuizHistory history={makeHistory()} stats={makeStats({ favouriteTopic: null })} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThan(0);
  });

  // ── History list ───────────────────────────────────────────────────────

  it("renders history items", () => {
    render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
    expect(screen.getByText("Recent quizzes")).toBeInTheDocument();
    expect(screen.getByText("Showing last 3 sessions")).toBeInTheDocument();
  });

  it("renders topic names in history", () => {
    render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
    // "Greetings" is both in stats and history
    expect(screen.getByText("Numbers")).toBeInTheDocument();
    expect(screen.getByText("Colors")).toBeInTheDocument();
  });

  it("renders formatted dates", () => {
    render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
    expect(screen.getByText(/Jan 15, 2025/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 14, 2025/)).toBeInTheDocument();
  });

  it("renders '—' for null dates", () => {
    render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
    // Third item has null startedAt — the "—" is inside a text node like "advanced · —"
    const colorsButton = screen.getByText("Colors").closest("button")!;
    expect(colorsButton.textContent).toContain("—");
  });

  it("renders score badges with correct percentages", () => {
    render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    // Third item: score is null, so calculated: 3/10 * 100 = 30
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("renders difficulty labels", () => {
    render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
    expect(screen.getByText(/beginner/)).toBeInTheDocument();
    expect(screen.getByText(/intermediate/)).toBeInTheDocument();
    expect(screen.getByText(/advanced/)).toBeInTheDocument();
  });

  // ── Empty history ──────────────────────────────────────────────────────

  it("shows empty state when no history", () => {
    render(<QuizHistory history={[]} stats={makeStats()} />);
    expect(screen.getByText(/You haven't taken any AI quizzes yet/)).toBeInTheDocument();
    expect(screen.getByText("Showing last 0 sessions")).toBeInTheDocument();
  });

  // ── Score badge colors ─────────────────────────────────────────────────

  it("applies emerald badge for scores >= 80", () => {
    render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
    const badge90 = screen.getByText("90%");
    expect(badge90.className).toContain("emerald");
  });

  it("applies amber badge for scores >= 50", () => {
    render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
    const badge60 = screen.getByText("60%");
    expect(badge60.className).toContain("amber");
  });

  it("applies rose badge for scores < 50", () => {
    render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
    const badge30 = screen.getByText("30%");
    expect(badge30.className).toContain("rose");
  });

  // ── Score badge with totalQuestions = 0 ────────────────────────────────

  it("shows 0% when totalQuestions is 0", () => {
    const history: any[] = [
      {
        id: 99,
        topic: "Empty",
        difficulty: "beginner",
        score: null,
        totalQuestions: 0,
        correctAnswers: 0,
        startedAt: new Date(),
      },
    ];
    render(<QuizHistory history={history} stats={makeStats()} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  // ── getScoreBadgeClasses null/undefined handling ───────────────────────

  it("handles null score in badge classes", () => {
    const history: any[] = [
      {
        id: 88,
        topic: "NullScore",
        difficulty: "beginner",
        score: null,
        totalQuestions: 0,
        correctAnswers: 0,
        startedAt: new Date(),
      },
    ];
    render(<QuizHistory history={history} stats={makeStats()} />);
    const badge = screen.getByText("0%");
    expect(badge.className).toContain("rose");
  });

  // ── Dialog / Session detail ────────────────────────────────────────────

  describe("Session review dialog", () => {
    it("opens dialog when clicking a history item", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 1,
            topic: "Greetings",
            difficulty: "beginner",
            totalQuestions: 10,
            correctAnswers: 9,
            startedAt: "2025-01-15T10:00:00Z",
            questions: [
              {
                id: 1,
                question: "Hello in Sinhala?",
                correctAnswer: "Ayubowan",
                userAnswer: "Ayubowan",
                isCorrect: true,
                explanation: "Basic greeting",
              },
            ],
          }),
      });
      global.fetch = mockFetch;

      render(<QuizHistory history={makeHistory()} stats={makeStats()} />);

      clickHistoryItem("Greetings");

      await waitFor(() => {
        expect(screen.getByTestId("dialog")).toBeInTheDocument();
      });

      // Should show loading first, then session details
      await waitFor(() => {
        expect(screen.getByText("Review: Greetings")).toBeInTheDocument();
      });
    });

    it("shows loading state while fetching session", async () => {
      let resolveJson: any;
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          new Promise((r) => {
            resolveJson = r;
          }),
      });
      global.fetch = mockFetch;

      render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
      clickHistoryItem("Greetings");

      await waitFor(() => {
        expect(screen.getByText("Loading session...")).toBeInTheDocument();
      });

      resolveJson({
        id: 1,
        topic: "Greetings",
        difficulty: "beginner",
        totalQuestions: 10,
        correctAnswers: 9,
        startedAt: "2025-01-15T10:00:00Z",
        questions: [],
      });
    });

    it("shows 'Quiz review' title when no session selected", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      });
      global.fetch = mockFetch;

      render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
      clickHistoryItem("Greetings");

      await waitFor(() => {
        expect(screen.getByTestId("dialog")).toBeInTheDocument();
      });

      // After fetch failure, selectedSession is null
      await waitFor(() => {
        expect(screen.getByText("Quiz review")).toBeInTheDocument();
      });
    });

    it("shows no questions message for empty session", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 1,
            topic: "Greetings",
            difficulty: "beginner",
            totalQuestions: 10,
            correctAnswers: 9,
            startedAt: "2025-01-15T10:00:00Z",
            questions: [],
          }),
      });
      global.fetch = mockFetch;

      render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
      clickHistoryItem("Greetings");

      await waitFor(() => {
        expect(
          screen.getByText("No questions were recorded for this session.")
        ).toBeInTheDocument();
      });
    });

    it("renders question details in dialog", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 1,
            topic: "Greetings",
            difficulty: "beginner",
            totalQuestions: 2,
            correctAnswers: 1,
            startedAt: "2025-01-15T10:00:00Z",
            questions: [
              {
                id: 1,
                question: "Hello?",
                correctAnswer: "Ayubowan",
                userAnswer: "Ayubowan",
                isCorrect: true,
                explanation: "Basic greeting",
              },
              {
                id: 2,
                question: "Goodbye?",
                correctAnswer: "Gihin ennam",
                userAnswer: null,
                isCorrect: false,
                explanation: null,
              },
            ],
          }),
      });
      global.fetch = mockFetch;

      render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
      clickHistoryItem("Greetings");

      await waitFor(() => {
        expect(screen.getByText(/Hello\?/)).toBeInTheDocument();
        expect(screen.getByText(/Goodbye\?/)).toBeInTheDocument();
        // "Ayubowan" appears as both userAnswer and correctAnswer for Q1
        expect(screen.getAllByText("Ayubowan").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("No answer")).toBeInTheDocument();
        expect(screen.getByText(/Basic greeting/)).toBeInTheDocument();
        expect(screen.getByText("Correct")).toBeInTheDocument();
        expect(screen.getByText("Incorrect")).toBeInTheDocument();
      });
    });

    it("closes dialog with Close button", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 1,
            topic: "Greetings",
            difficulty: "beginner",
            totalQuestions: 10,
            correctAnswers: 9,
            startedAt: "2025-01-15T10:00:00Z",
            questions: [],
          }),
      });
      global.fetch = mockFetch;

      render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
      clickHistoryItem("Greetings");

      await waitFor(() => {
        expect(screen.getByTestId("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Close"));

      await waitFor(() => {
        expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
      });
    });

    it("closes dialog via onOpenChange", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 1,
            topic: "Greetings",
            difficulty: "beginner",
            totalQuestions: 10,
            correctAnswers: 9,
            startedAt: "2025-01-15T10:00:00Z",
            questions: [],
          }),
      });
      global.fetch = mockFetch;

      render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
      clickHistoryItem("Greetings");

      await waitFor(() => {
        expect(screen.getByTestId("dialog")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("dialog-close-trigger"));

      await waitFor(() => {
        expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
      });
    });

    it("handles fetch error silently", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      global.fetch = mockFetch;

      render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
      clickHistoryItem("Greetings");

      await waitFor(() => {
        expect(screen.getByTestId("dialog")).toBeInTheDocument();
      });
    });

    it("ignores stale fetch responses when another session is clicked", async () => {
      let resolveFirst: any;
      let resolveSecond: any;
      let callCount = 0;

      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () =>
              new Promise((r) => {
                resolveFirst = r;
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            new Promise((r) => {
              resolveSecond = r;
            }),
        });
      });
      global.fetch = mockFetch;

      render(<QuizHistory history={makeHistory()} stats={makeStats()} />);

      // Click first item
      clickHistoryItem("Greetings");

      // Wait for the first fetch to be called before clicking the second
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Click second item before first json resolves
      fireEvent.click(screen.getByText("Numbers").closest("button")!);

      // Wait for the second fetch call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Resolve first (should be ignored due to generation check)
      resolveFirst({
        id: 1,
        topic: "Greetings",
        difficulty: "beginner",
        totalQuestions: 10,
        correctAnswers: 9,
        startedAt: "2025-01-15T10:00:00Z",
        questions: [],
      });

      // Resolve second
      resolveSecond({
        id: 2,
        topic: "Numbers",
        difficulty: "intermediate",
        totalQuestions: 10,
        correctAnswers: 6,
        startedAt: "2025-01-14T10:00:00Z",
        questions: [],
      });

      await waitFor(() => {
        expect(screen.getByText("Review: Numbers")).toBeInTheDocument();
      });
    });

    it("shows score and difficulty in dialog header", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 1,
            topic: "Greetings",
            difficulty: "intermediate",
            totalQuestions: 10,
            correctAnswers: 7,
            startedAt: "2025-01-15T10:00:00Z",
            questions: [],
          }),
      });
      global.fetch = mockFetch;

      render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
      clickHistoryItem("Greetings");

      await waitFor(() => {
        expect(screen.getByText("7 / 10")).toBeInTheDocument();
        // "intermediate" appears in both history list and dialog
        expect(screen.getAllByText("intermediate").length).toBeGreaterThanOrEqual(2);
      });
    });

    it("shows '—' values when no session is loaded in dialog", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
      });
      global.fetch = mockFetch;

      render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
      clickHistoryItem("Greetings");

      await waitFor(() => {
        expect(screen.getByTestId("dialog")).toBeInTheDocument();
      });

      // Dialog should show "—" for score, difficulty, date since no session loaded
      await waitFor(() => {
        const dashes = screen.getAllByText("—");
        expect(dashes.length).toBeGreaterThan(0);
      });
    });

    it("shows 'Could not load this session.' when open but no selectedSession after loading", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
      });
      global.fetch = mockFetch;

      render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
      clickHistoryItem("Greetings");

      await waitFor(
        () => {
          expect(screen.getByText("Could not load this session.")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("renders dialog description", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 1,
            topic: "Greetings",
            difficulty: "beginner",
            totalQuestions: 10,
            correctAnswers: 9,
            startedAt: "2025-01-15T10:00:00Z",
            questions: [],
          }),
      });
      global.fetch = mockFetch;

      render(<QuizHistory history={makeHistory()} stats={makeStats()} />);
      clickHistoryItem("Greetings");

      await waitFor(() => {
        expect(
          screen.getByText("Review how you answered each question compared to the correct answer.")
        ).toBeInTheDocument();
      });
    });
  });
});
