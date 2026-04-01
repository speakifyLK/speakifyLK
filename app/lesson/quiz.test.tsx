import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// ── Hoisted mocks ────────────────────────────────────────────────────
const mockPush = vi.hoisted(() => vi.fn());
const mockUpsertChallengeProgress = vi.hoisted(() => vi.fn());
const mockReduceHearts = vi.hoisted(() => vi.fn());
const mockOpenHeartsModal = vi.hoisted(() => vi.fn());
const mockOpenPracticeModal = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockCorrectPlay = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockIncorrectPlay = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

let audioCallCount = 0;
vi.mock("react-use", () => ({
  useAudio: (opts: any) => {
    audioCallCount++;
    // 1st call: correct audio, 2nd call: incorrect audio, 3rd call: finish audio
    if (audioCallCount % 3 === 1) {
      return [<audio key="correct" data-testid="correct-audio" />, {}, { play: mockCorrectPlay }];
    } else if (audioCallCount % 3 === 2) {
      return [
        <audio key="incorrect" data-testid="incorrect-audio" />,
        {},
        { play: mockIncorrectPlay },
      ];
    } else {
      return [<audio key="finish" data-testid="finish-audio" />, {}, { play: vi.fn() }];
    }
  },
  useWindowSize: () => ({ width: 1024, height: 768 }),
  useMount: (fn: () => void) => {
    // Call immediately in test
    fn();
  },
}));

vi.mock("react-confetti", () => ({
  default: (props: any) => <div data-testid="confetti" />,
}));

vi.mock("sonner", () => ({
  toast: { error: mockToastError },
}));

vi.mock("@/actions/challenge-progress", () => ({
  upsertChallengeProgress: mockUpsertChallengeProgress,
}));

vi.mock("@/actions/user-progress", () => ({
  reduceHearts: mockReduceHearts,
}));

vi.mock("@/store/use-hearts-modal", () => ({
  useHeartsModal: () => ({ open: mockOpenHeartsModal }),
}));

vi.mock("@/store/use-practice-modal", () => ({
  usePracticeModal: () => ({ open: mockOpenPracticeModal }),
}));

vi.mock("./challenge", () => ({
  Challenge: ({ options, onSelect, status, selectedOption, disabled, type }: any) => (
    <div data-testid="challenge" data-status={status} data-disabled={disabled} data-type={type}>
      {options.map((opt: any) => (
        <button
          key={opt.id}
          data-testid={`option-${opt.id}`}
          data-selected={selectedOption === opt.id}
          onClick={() => onSelect(opt.id)}
        >
          {opt.text}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("./footer", () => ({
  Footer: ({ onCheck, status, disabled, lessonId }: any) => (
    <div data-testid="footer" data-status={status} data-disabled={String(disabled)}>
      <button data-testid="check-btn" onClick={onCheck} disabled={disabled}>
        {status === "none" && "Check"}
        {status === "correct" && "Next"}
        {status === "wrong" && "Retry"}
        {status === "completed" && "Continue"}
      </button>
      {lessonId && <span data-testid="lesson-id">{lessonId}</span>}
    </div>
  ),
}));

vi.mock("./header", () => ({
  Header: ({ hearts, percentage, hasActiveSubscription }: any) => (
    <div
      data-testid="header"
      data-hearts={hearts}
      data-percentage={percentage}
      data-sub={hasActiveSubscription}
    >
      Header
    </div>
  ),
}));

vi.mock("./question-bubble", () => ({
  QuestionBubble: ({ question }: any) => <div data-testid="question-bubble">{question}</div>,
}));

vi.mock("./result-card", () => ({
  ResultCard: ({ variant, value }: any) => (
    <div data-testid={`result-card-${variant}`}>{value}</div>
  ),
}));

import { Quiz } from "./quiz";

// ── Test data ────────────────────────────────────────────────────────
const makeChallenge = (
  id: number,
  type: "SELECT" | "ASSIST",
  question: string,
  completed: boolean,
  options: { id: number; text: string; correct: boolean }[]
) => ({
  id,
  lessonId: 1,
  type,
  question,
  order: id,
  completed,
  challengeOptions: options.map((o) => ({
    ...o,
    challengeId: id,
    imageSrc: null,
    audioSrc: null,
  })),
});

const challenge1 = makeChallenge(1, "SELECT", "What is Hello?", false, [
  { id: 10, text: "ආයුබෝවන්", correct: true },
  { id: 11, text: "ස්තුතියි", correct: false },
  { id: 12, text: "සමාවෙන්න", correct: false },
]);

const challenge2 = makeChallenge(2, "ASSIST", "Translate: Thank you", false, [
  { id: 20, text: "ආයුබෝවන්", correct: false },
  { id: 21, text: "ස්තුතියි", correct: true },
]);

const baseProps = {
  initialPercentage: 0,
  initialHearts: 5,
  initialLessonId: 1,
  initialLessonChallenges: [challenge1, challenge2],
  userSubscription: null,
};

describe("Quiz", () => {
  beforeAll(() => {
    // polyfill scrollTo for jsdom
    window.scrollTo = vi.fn();
    Element.prototype.scrollTo = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    audioCallCount = 0;
    mockUpsertChallengeProgress.mockResolvedValue({});
    mockReduceHearts.mockResolvedValue({});
  });

  // ── Initial Rendering ────────────────────────────────────────────
  it("renders the first challenge", () => {
    render(<Quiz {...baseProps} />);
    expect(screen.getByText("What is Hello?")).toBeInTheDocument();
    expect(screen.getByTestId("challenge")).toBeInTheDocument();
  });

  it("renders header with initial hearts and percentage", () => {
    render(<Quiz {...baseProps} />);
    const header = screen.getByTestId("header");
    expect(header).toHaveAttribute("data-hearts", "5");
    expect(header).toHaveAttribute("data-percentage", "0");
  });

  it("renders footer with none status initially", () => {
    render(<Quiz {...baseProps} />);
    const footer = screen.getByTestId("footer");
    expect(footer).toHaveAttribute("data-status", "none");
  });

  it("renders footer as disabled when no option selected", () => {
    render(<Quiz {...baseProps} />);
    const footer = screen.getByTestId("footer");
    expect(footer).toHaveAttribute("data-disabled", "true");
  });

  // ── Option selection ─────────────────────────────────────────────
  it("enables footer when an option is selected", () => {
    render(<Quiz {...baseProps} />);
    fireEvent.click(screen.getByTestId("option-10"));
    const footer = screen.getByTestId("footer");
    expect(footer).toHaveAttribute("data-disabled", "false");
  });

  // ── Correct answer flow ──────────────────────────────────────────
  it("handles correct answer — sets status to correct", async () => {
    mockUpsertChallengeProgress.mockResolvedValue({});
    render(<Quiz {...baseProps} />);

    // Select the correct option
    fireEvent.click(screen.getByTestId("option-10"));
    // Click check
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("footer")).toHaveAttribute("data-status", "correct");
    });
    expect(mockUpsertChallengeProgress).toHaveBeenCalledWith(1);
    expect(mockCorrectPlay).toHaveBeenCalled();
  });

  it("advances to next challenge on Continue after correct", async () => {
    mockUpsertChallengeProgress.mockResolvedValue({});
    render(<Quiz {...baseProps} />);

    // Correct answer on challenge 1
    fireEvent.click(screen.getByTestId("option-10"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("footer")).toHaveAttribute("data-status", "correct");
    });

    // Click Next
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    // Should now show challenge 2 — ASSIST type shows QuestionBubble
    await waitFor(() => {
      expect(screen.getByText("Select the correct meaning")).toBeInTheDocument();
    });
  });

  // ── Wrong answer flow ────────────────────────────────────────────
  it("handles wrong answer — sets status to wrong", async () => {
    mockReduceHearts.mockResolvedValue({});
    render(<Quiz {...baseProps} />);

    // Select wrong option
    fireEvent.click(screen.getByTestId("option-11"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("footer")).toHaveAttribute("data-status", "wrong");
    });
    expect(mockReduceHearts).toHaveBeenCalledWith(1);
    expect(mockIncorrectPlay).toHaveBeenCalled();
  });

  it("decrements hearts on wrong answer", async () => {
    mockReduceHearts.mockResolvedValue({});
    render(<Quiz {...baseProps} />);

    fireEvent.click(screen.getByTestId("option-11"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      const header = screen.getByTestId("header");
      expect(header).toHaveAttribute("data-hearts", "4");
    });
  });

  it("resets selection after Retry on wrong answer", async () => {
    mockReduceHearts.mockResolvedValue({});
    render(<Quiz {...baseProps} />);

    fireEvent.click(screen.getByTestId("option-11"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("footer")).toHaveAttribute("data-status", "wrong");
    });

    // Click Retry
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    // Status should reset to none, and selection cleared
    await waitFor(() => {
      expect(screen.getByTestId("footer")).toHaveAttribute("data-status", "none");
    });
  });

  // ── Hearts modal ─────────────────────────────────────────────────
  it("opens hearts modal when upsertChallengeProgress returns hearts error", async () => {
    mockUpsertChallengeProgress.mockResolvedValue({ error: "hearts" });
    render(<Quiz {...baseProps} />);

    fireEvent.click(screen.getByTestId("option-10"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      expect(mockOpenHeartsModal).toHaveBeenCalled();
    });
  });

  it("opens hearts modal when reduceHearts returns hearts error", async () => {
    mockReduceHearts.mockResolvedValue({ error: "hearts" });
    render(<Quiz {...baseProps} />);

    fireEvent.click(screen.getByTestId("option-11"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      expect(mockOpenHeartsModal).toHaveBeenCalled();
    });
  });

  it("does not decrement hearts when reduceHearts returns hearts error", async () => {
    mockReduceHearts.mockResolvedValue({ error: "hearts" });
    render(<Quiz {...baseProps} />);

    fireEvent.click(screen.getByTestId("option-11"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      // Hearts should remain 5
      const header = screen.getByTestId("header");
      expect(header).toHaveAttribute("data-hearts", "5");
    });
  });

  // ── Server error ─────────────────────────────────────────────────
  it("shows toast when upsertChallengeProgress throws", async () => {
    mockUpsertChallengeProgress.mockRejectedValue(new Error("Server error"));
    render(<Quiz {...baseProps} />);

    fireEvent.click(screen.getByTestId("option-10"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Something went wrong. Please try again.");
    });
  });

  it("shows toast when reduceHearts throws", async () => {
    mockReduceHearts.mockRejectedValue(new Error("Server error"));
    render(<Quiz {...baseProps} />);

    fireEvent.click(screen.getByTestId("option-11"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Something went wrong. Please try again.");
    });
  });

  // ── Completion screen ────────────────────────────────────────────
  it("shows finish screen when all challenges completed", async () => {
    mockUpsertChallengeProgress.mockResolvedValue({});
    render(<Quiz {...baseProps} />);

    // Complete challenge 1
    fireEvent.click(screen.getByTestId("option-10"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("footer")).toHaveAttribute("data-status", "correct");
    });

    // Next
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    // Complete challenge 2
    await waitFor(() => {
      expect(screen.getByTestId("option-21")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("option-21"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("footer")).toHaveAttribute("data-status", "correct");
    });

    // Next — should show completion
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      expect(screen.getByText(/Great job/)).toBeInTheDocument();
      expect(screen.getByText(/completed the lesson/)).toBeInTheDocument();
    });
  });

  it("shows confetti on completion", async () => {
    mockUpsertChallengeProgress.mockResolvedValue({});
    render(<Quiz {...baseProps} />);

    // Fast-complete both challenges
    fireEvent.click(screen.getByTestId("option-10"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("footer")).toHaveAttribute("data-status", "correct");
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("option-21")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("option-21"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("footer")).toHaveAttribute("data-status", "correct");
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("confetti")).toBeInTheDocument();
    });
  });

  it("shows result cards with points and hearts on completion", async () => {
    mockUpsertChallengeProgress.mockResolvedValue({});
    render(<Quiz {...baseProps} />);

    // Complete both
    fireEvent.click(screen.getByTestId("option-10"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("footer")).toHaveAttribute("data-status", "correct");
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("option-21")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("option-21"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("footer")).toHaveAttribute("data-status", "correct");
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      // 2 challenges * 10 = 20 points
      expect(screen.getByTestId("result-card-points")).toHaveTextContent("20");
      expect(screen.getByTestId("result-card-hearts")).toHaveTextContent("5");
    });
  });

  it("navigates to /learn when Continue is clicked on completion screen", async () => {
    mockUpsertChallengeProgress.mockResolvedValue({});
    render(<Quiz {...baseProps} />);

    // Complete both
    fireEvent.click(screen.getByTestId("option-10"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("footer")).toHaveAttribute("data-status", "correct");
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("option-21")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("option-21"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("footer")).toHaveAttribute("data-status", "correct");
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("check-btn")).toHaveTextContent("Continue");
    });

    fireEvent.click(screen.getByTestId("check-btn"));
    expect(mockPush).toHaveBeenCalledWith("/learn");
  });

  // ── Practice mode (100% initial percentage) ──────────────────────
  it("opens practice modal on mount when initialPercentage is 100", () => {
    render(<Quiz {...baseProps} initialPercentage={100} />);
    expect(mockOpenPracticeModal).toHaveBeenCalled();
  });

  it("resets percentage to 0 when initialPercentage is 100 (practice mode)", () => {
    render(<Quiz {...baseProps} initialPercentage={100} />);
    const header = screen.getByTestId("header");
    expect(header).toHaveAttribute("data-percentage", "0");
  });

  it("gains a heart on correct answer in practice mode", async () => {
    mockUpsertChallengeProgress.mockResolvedValue({});
    render(<Quiz {...baseProps} initialPercentage={100} initialHearts={3} />);

    fireEvent.click(screen.getByTestId("option-10"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      const header = screen.getByTestId("header");
      expect(header).toHaveAttribute("data-hearts", "4");
    });
  });

  it("does not exceed MAX_HEARTS in practice mode", async () => {
    mockUpsertChallengeProgress.mockResolvedValue({});
    render(<Quiz {...baseProps} initialPercentage={100} initialHearts={5} />);

    fireEvent.click(screen.getByTestId("option-10"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      const header = screen.getByTestId("header");
      expect(header).toHaveAttribute("data-hearts", "5");
    });
  });

  // ── ASSIST type ──────────────────────────────────────────────────
  it("renders QuestionBubble for ASSIST type challenges", async () => {
    mockUpsertChallengeProgress.mockResolvedValue({});
    // Skip to challenge 2 (ASSIST type)
    render(
      <Quiz
        {...baseProps}
        initialLessonChallenges={[{ ...challenge1, completed: true }, challenge2]}
      />
    );

    // Challenge 2 is ASSIST, which should show "Select the correct meaning"
    expect(screen.getByText("Select the correct meaning")).toBeInTheDocument();
    expect(screen.getByTestId("question-bubble")).toBeInTheDocument();
  });

  // ── Subscription — infinity hearts on completion ─────────────────
  it("shows infinity hearts on completion when user has active subscription", async () => {
    mockUpsertChallengeProgress.mockResolvedValue({});
    const subProps = {
      ...baseProps,
      userSubscription: {
        id: 1,
        userId: "user_123",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        stripePriceId: "price_123",
        stripeCurrentPeriodEnd: new Date(),
        isActive: true,
      },
    };
    render(<Quiz {...subProps} />);

    // Complete both
    fireEvent.click(screen.getByTestId("option-10"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("footer")).toHaveAttribute("data-status", "correct");
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("option-21")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("option-21"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("footer")).toHaveAttribute("data-status", "correct");
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("result-card-hearts")).toHaveTextContent("Infinity");
    });
  });

  // ── Subscription — active subscription shows in header ───────────
  it("passes hasActiveSubscription=true to header when subscribed", () => {
    render(
      <Quiz
        {...baseProps}
        userSubscription={{
          id: 1,
          userId: "user_123",
          stripeCustomerId: "cus_123",
          stripeSubscriptionId: "sub_123",
          stripePriceId: "price_123",
          stripeCurrentPeriodEnd: new Date(),
          isActive: true,
        }}
      />
    );
    const header = screen.getByTestId("header");
    expect(header).toHaveAttribute("data-sub", "true");
  });

  // ── Does not select when status is not none ──────────────────────
  it("ignores option clicks when status is not none", async () => {
    mockUpsertChallengeProgress.mockResolvedValue({});
    render(<Quiz {...baseProps} />);

    // Get correct answer, enter "correct" state
    fireEvent.click(screen.getByTestId("option-10"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("footer")).toHaveAttribute("data-status", "correct");
    });

    // Try to select another option while in "correct" state — should be ignored
    fireEvent.click(screen.getByTestId("option-11"));

    // The selected option should still be the correct one (10), not 11
    expect(screen.getByTestId("option-10")).toHaveAttribute("data-selected", "true");
  });

  // ── onContinue does nothing when no option selected ──────────────
  it("does nothing when Check is clicked without selection", async () => {
    render(<Quiz {...baseProps} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });
    // No API calls should be made
    expect(mockUpsertChallengeProgress).not.toHaveBeenCalled();
    expect(mockReduceHearts).not.toHaveBeenCalled();
  });

  // ── Starts at first uncompleted challenge ────────────────────────
  it("starts at the first uncompleted challenge", () => {
    render(
      <Quiz
        {...baseProps}
        initialLessonChallenges={[{ ...challenge1, completed: true }, challenge2]}
      />
    );
    // Should show challenge 2 (ASSIST)
    expect(screen.getByText("Select the correct meaning")).toBeInTheDocument();
  });

  // ── Percentage increment ─────────────────────────────────────────
  it("increments percentage on correct answer", async () => {
    mockUpsertChallengeProgress.mockResolvedValue({});
    render(<Quiz {...baseProps} />);

    fireEvent.click(screen.getByTestId("option-10"));
    await act(async () => {
      fireEvent.click(screen.getByTestId("check-btn"));
    });

    await waitFor(() => {
      const header = screen.getByTestId("header");
      // 100 / 2 challenges = 50
      expect(header).toHaveAttribute("data-percentage", "50");
    });
  });
});
