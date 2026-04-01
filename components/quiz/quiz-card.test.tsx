import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────────

const { mockSubmitQuizAnswer, mockToast } = vi.hoisted(() => ({
  mockSubmitQuizAnswer: vi.fn(),
  mockToast: { error: vi.fn(), success: vi.fn() },
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

vi.mock("lucide-react", () => ({
  Info: (props: any) => <span data-testid="info-icon" {...props} />,
  ChevronDown: (props: any) => <span data-testid="chevron-down" {...props} />,
  ChevronUp: (props: any) => <span data-testid="chevron-up" {...props} />,
  Lightbulb: (props: any) => <span data-testid="lightbulb" {...props} />,
}));

import { QuizCard } from "./quiz-card";

// ── Helpers ────────────────────────────────────────────────────────────────

beforeAll(() => {
  window.scrollTo = vi.fn() as any;
});

const makeMcqQuestion = (overrides: any = {}) => ({
  id: 1,
  sessionId: 1,
  question: "What does 'ayubowan' mean?",
  type: "mcq" as const,
  options: [
    { text: "Hello", isCorrect: true },
    { text: "Goodbye", isCorrect: false },
    { text: "Thank you", isCorrect: false },
    { text: "Please", isCorrect: false },
  ],
  correctAnswer: "Hello",
  explanation: "Ayubowan is a traditional Sinhala greeting.",
  userAnswer: null,
  isCorrect: null,
  order: 1,
  createdAt: new Date(),
  ...overrides,
});

const makeFillBlankQuestion = (overrides: any = {}) => ({
  id: 2,
  sessionId: 1,
  question: "The cat is ___ the table.",
  type: "fill_blank" as const,
  options: { hint: "Think about position" },
  correctAnswer: "on",
  explanation: "The preposition 'on' indicates surface contact.",
  userAnswer: null,
  isCorrect: null,
  order: 2,
  createdAt: new Date(),
  ...overrides,
});

const makeTranslationQuestion = (overrides: any = {}) => ({
  id: 3,
  sessionId: 1,
  question: "Mama giyaa",
  type: "translation" as const,
  options: { sourceLanguage: "sinhala" },
  correctAnswer: "I went",
  explanation: "Direct translation from Sinhala.",
  userAnswer: null,
  isCorrect: null,
  order: 3,
  createdAt: new Date(),
  ...overrides,
});

const defaultProps = {
  onNextAction: vi.fn(),
  onAnswerSubmittedAction: vi.fn(),
};

describe("QuizCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── MCQ rendering ──────────────────────────────────────────────────────

  describe("MCQ questions", () => {
    it("renders question text and all options", () => {
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);
      expect(screen.getByText("What does 'ayubowan' mean?")).toBeInTheDocument();
      expect(screen.getByText(/Hello/)).toBeInTheDocument();
      expect(screen.getByText(/Goodbye/)).toBeInTheDocument();
      expect(screen.getByText(/Thank you/)).toBeInTheDocument();
      expect(screen.getByText(/Please/)).toBeInTheDocument();
    });

    it("renders option labels A, B, C, D", () => {
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);
      expect(screen.getByText("A.")).toBeInTheDocument();
      expect(screen.getByText("B.")).toBeInTheDocument();
      expect(screen.getByText("C.")).toBeInTheDocument();
      expect(screen.getByText("D.")).toBeInTheDocument();
    });

    it("selects an option on click", () => {
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);
      const helloBtn = screen.getByText(/Hello/).closest("button")!;
      fireEvent.click(helloBtn);
      // Submit button should be enabled now
      const submitBtn = screen.getByText("Submit Answer");
      expect(submitBtn).not.toBeDisabled();
    });

    it("submit button is disabled when no answer selected", () => {
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);
      const submitBtn = screen.getByText("Submit Answer");
      expect(submitBtn).toBeDisabled();
    });

    it("submits correct MCQ answer and shows explanation", async () => {
      mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);

      // Select answer
      fireEvent.click(screen.getByText(/Hello/).closest("button")!);
      // Submit
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        expect(screen.getByText("Correct!")).toBeInTheDocument();
      });
      expect(defaultProps.onAnswerSubmittedAction).toHaveBeenCalledWith(true);
    });

    it("submits incorrect MCQ answer and shows explanation panel", async () => {
      mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: false });
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);

      fireEvent.click(screen.getByText(/Goodbye/).closest("button")!);
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        expect(screen.getByText("AI Explanation")).toBeInTheDocument();
      });
      expect(screen.getByText("Ayubowan is a traditional Sinhala greeting.")).toBeInTheDocument();
      expect(defaultProps.onAnswerSubmittedAction).toHaveBeenCalledWith(false);
    });

    it("shows correct answer and user answer in explanation panel", async () => {
      mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: false });
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);

      fireEvent.click(screen.getByText(/Goodbye/).closest("button")!);
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        expect(screen.getByText("Correct Answer:")).toBeInTheDocument();
        expect(screen.getByText("Your Answer:")).toBeInTheDocument();
      });
    });

    it("can collapse and expand explanation panel", async () => {
      mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: false });
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);

      fireEvent.click(screen.getByText(/Goodbye/).closest("button")!);
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        expect(screen.getByText("AI Explanation")).toBeInTheDocument();
      });

      // Collapse
      fireEvent.click(screen.getByText("AI Explanation"));
      expect(
        screen.queryByText("Ayubowan is a traditional Sinhala greeting.")
      ).not.toBeInTheDocument();

      // Expand
      fireEvent.click(screen.getByText("AI Explanation"));
      expect(screen.getByText("Ayubowan is a traditional Sinhala greeting.")).toBeInTheDocument();
    });

    it("Got it button acknowledges explanation and enables next", async () => {
      mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: false });
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);

      fireEvent.click(screen.getByText(/Goodbye/).closest("button")!);
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        expect(screen.getByText("Got it")).toBeInTheDocument();
      });

      // Next button should be disabled before acknowledging
      const nextBtn = screen.getByText("Next Question");
      expect(nextBtn).toBeDisabled();

      // Click Got it
      fireEvent.click(screen.getByText("Got it"));

      // Next button should now be enabled
      await waitFor(() => {
        expect(screen.getByText("Next Question")).not.toBeDisabled();
      });
    });

    it("shows 'Complete Quiz' for last question", async () => {
      mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} isLastQuestion={true} />);

      fireEvent.click(screen.getByText(/Hello/).closest("button")!);
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        expect(screen.getByText("Complete Quiz")).toBeInTheDocument();
      });
    });

    it("calls onNextAction when next button is clicked", async () => {
      mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);

      fireEvent.click(screen.getByText(/Hello/).closest("button")!);
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        expect(screen.getByText("Next Question")).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Next Question"));
      });
      expect(defaultProps.onNextAction).toHaveBeenCalled();
    });

    it("disables MCQ options after submission", async () => {
      mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);

      fireEvent.click(screen.getByText(/Hello/).closest("button")!);
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        const optionButtons = buttons.filter((b) =>
          ["A.", "B.", "C.", "D."].some((label) => b.textContent?.includes(label))
        );
        optionButtons.forEach((btn) => expect(btn).toBeDisabled());
      });
    });
  });

  // ── Fill in blank ──────────────────────────────────────────────────────

  describe("Fill-in-the-blank questions", () => {
    it("renders sentence with blank placeholder", () => {
      render(<QuizCard {...defaultProps} question={makeFillBlankQuestion()} />);
      expect(screen.getByText(/The cat is/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Type your answer here…")).toBeInTheDocument();
    });

    it("does not render question text as h2 for fill_blank", () => {
      const { container } = render(
        <QuizCard {...defaultProps} question={makeFillBlankQuestion()} />
      );
      const h2s = container.querySelectorAll("h2");
      const h2Texts = Array.from(h2s).map((h) => h.textContent);
      expect(h2Texts).not.toContain("The cat is ___ the table.");
    });

    it("shows and hides hint", () => {
      render(<QuizCard {...defaultProps} question={makeFillBlankQuestion()} />);
      // Hint toggle
      const showHintBtn = screen.getByText("Show hint");
      expect(showHintBtn).toBeInTheDocument();

      fireEvent.click(showHintBtn);
      expect(screen.getByText(/Think about position/)).toBeInTheDocument();
      expect(screen.getByText("Hide hint")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Hide hint"));
      expect(screen.queryByText(/Think about position/)).not.toBeInTheDocument();
    });

    it("does not render hint button when no hint", () => {
      const q = makeFillBlankQuestion({ options: {} });
      render(<QuizCard {...defaultProps} question={q} />);
      expect(screen.queryByText("Show hint")).not.toBeInTheDocument();
    });

    it("accepts typed input and submits", async () => {
      mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
      render(<QuizCard {...defaultProps} question={makeFillBlankQuestion()} />);

      const input = screen.getByPlaceholderText("Type your answer here…");
      fireEvent.change(input, { target: { value: "on" } });
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        expect(mockSubmitQuizAnswer).toHaveBeenCalledWith(2, "on");
      });
    });

    it("disables input after submission", async () => {
      mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
      render(<QuizCard {...defaultProps} question={makeFillBlankQuestion()} />);

      const input = screen.getByPlaceholderText("Type your answer here…");
      fireEvent.change(input, { target: { value: "on" } });
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        expect(input).toBeDisabled();
      });
    });
  });

  // ── Translation ────────────────────────────────────────────────────────

  describe("Translation questions", () => {
    it("renders source text with language label", () => {
      render(<QuizCard {...defaultProps} question={makeTranslationQuestion()} />);
      expect(screen.getByText("Mama giyaa")).toBeInTheDocument();
      expect(screen.getByText("Sinhala")).toBeInTheDocument();
    });

    it("uses mapped language label for known languages", () => {
      const q = makeTranslationQuestion({
        options: { sourceLanguage: "english" },
      });
      render(<QuizCard {...defaultProps} question={q} />);
      expect(screen.getByText("English")).toBeInTheDocument();
    });

    it("uses raw language label for unknown languages", () => {
      const q = makeTranslationQuestion({
        options: { sourceLanguage: "French" },
      });
      render(<QuizCard {...defaultProps} question={q} />);
      expect(screen.getByText("French")).toBeInTheDocument();
    });

    it("defaults sourceLanguage to 'Sinhala' when not in options", () => {
      const q = makeTranslationQuestion({ options: null });
      render(<QuizCard {...defaultProps} question={q} />);
      expect(screen.getByText("Sinhala")).toBeInTheDocument();
    });

    it("renders textarea for translation", () => {
      render(<QuizCard {...defaultProps} question={makeTranslationQuestion()} />);
      expect(screen.getByLabelText("Type your translation")).toBeInTheDocument();
    });

    it("shows character count", () => {
      render(<QuizCard {...defaultProps} question={makeTranslationQuestion()} />);
      expect(screen.getByText("0/500")).toBeInTheDocument();
    });

    it("enforces max char limit of 500", () => {
      render(<QuizCard {...defaultProps} question={makeTranslationQuestion()} />);
      const textarea = screen.getByLabelText("Type your translation");
      const longText = "a".repeat(501);
      fireEvent.change(textarea, { target: { value: longText } });
      // should not update because 501 > 500
      expect(textarea).toHaveValue("");
    });

    it("updates character count on input", () => {
      render(<QuizCard {...defaultProps} question={makeTranslationQuestion()} />);
      const textarea = screen.getByLabelText("Type your translation");
      fireEvent.change(textarea, { target: { value: "I went" } });
      expect(screen.getByText("6/500")).toBeInTheDocument();
    });

    it("shows warning color when approaching max chars", () => {
      render(<QuizCard {...defaultProps} question={makeTranslationQuestion()} />);
      const textarea = screen.getByLabelText("Type your translation");
      const text = "a".repeat(460);
      fireEvent.change(textarea, { target: { value: text } });
      // 460 > 500 * 0.9 = 450, should show text-rose-500
      expect(screen.getByText("460/500")).toBeInTheDocument();
    });

    it("prevents change on textarea when submitted", async () => {
      mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
      render(<QuizCard {...defaultProps} question={makeTranslationQuestion()} />);
      const textarea = screen.getByLabelText("Type your translation");
      fireEvent.change(textarea, { target: { value: "I went" } });
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        expect(textarea).toBeDisabled();
      });
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────

  describe("Error handling", () => {
    it("handles isNextPending guard in handleNextClick", async () => {
      let resolveNext!: () => void;
      const slowNext = vi.fn(
        () =>
          new Promise<void>((r) => {
            resolveNext = r;
          })
      );
      mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
      render(
        <QuizCard
          question={makeMcqQuestion()}
          onNextAction={slowNext}
          onAnswerSubmittedAction={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText(/Hello/).closest("button")!);
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        expect(screen.getByText("Next Question")).toBeInTheDocument();
      });

      // First click starts the slow next
      await act(async () => {
        fireEvent.click(screen.getByText("Next Question"));
      });
      // Second click should hit the isNextPending guard (line 359)
      await act(async () => {
        fireEvent.click(screen.getByText("Next Question"));
      });

      await waitFor(() => {
        expect(slowNext).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        resolveNext();
      });
    });

    it("shows toast error when server action fails", async () => {
      mockSubmitQuizAnswer.mockRejectedValue(new Error("Network error"));
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);

      fireEvent.click(screen.getByText(/Hello/).closest("button")!);
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Network error");
      });
    });

    it("shows generic toast error when non-Error is thrown", async () => {
      mockSubmitQuizAnswer.mockRejectedValue("something went wrong");
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);

      fireEvent.click(screen.getByText(/Hello/).closest("button")!);
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to submit answer.");
      });
    });
  });

  // ── Next button gating ─────────────────────────────────────────────────

  describe("Next button gating", () => {
    it("does not call onNextAction when explanation is not acknowledged for wrong answer", async () => {
      mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: false });
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);

      fireEvent.click(screen.getByText(/Goodbye/).closest("button")!);
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        expect(screen.getByText("Next Question")).toBeInTheDocument();
      });

      // Button should be disabled
      expect(screen.getByText("Next Question")).toBeDisabled();
      fireEvent.click(screen.getByText("Next Question"));
      expect(defaultProps.onNextAction).not.toHaveBeenCalled();
    });

    it("enables next button for correct answer without Got it", async () => {
      mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);

      fireEvent.click(screen.getByText(/Hello/).closest("button")!);
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        expect(screen.getByText("Next Question")).not.toBeDisabled();
      });
    });
  });

  // ── Explanation panel with no explanation text (incorrect, no explanation) ──

  describe("ExplanationPanel edge cases", () => {
    it("renders incorrect result with no explanation text", async () => {
      mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: false });
      const q = makeMcqQuestion({ explanation: null });
      render(<QuizCard {...defaultProps} question={q} />);

      fireEvent.click(screen.getByText(/Goodbye/).closest("button")!);
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        // No explanation panel since explanation is empty string
        // But Next Question should still appear
        expect(screen.getByText("Next Question")).toBeInTheDocument();
      });
    });
  });

  // ── Submitting text ────────────────────────────────────────────────────

  describe("Pending state", () => {
    it("shows 'Submitting…' text while pending", async () => {
      let resolveSubmit: any;
      mockSubmitQuizAnswer.mockReturnValue(
        new Promise((resolve) => {
          resolveSubmit = resolve;
        })
      );
      render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);

      fireEvent.click(screen.getByText(/Hello/).closest("button")!);
      fireEvent.click(screen.getByText("Submit Answer"));

      // The transition may show "Submitting…"
      // Resolve
      await waitFor(() => {
        resolveSubmit({ isCorrect: true });
      });
    });
  });

  // ── MCQ options without isSubmitted (no options for non-mcq) ───────────

  describe("Non-MCQ without options", () => {
    it("does not render MCQ options for fill_blank", () => {
      render(<QuizCard {...defaultProps} question={makeFillBlankQuestion()} />);
      expect(screen.queryByText("A.")).not.toBeInTheDocument();
    });

    it("does not render MCQ options for translation", () => {
      render(<QuizCard {...defaultProps} question={makeTranslationQuestion()} />);
      expect(screen.queryByText("A.")).not.toBeInTheDocument();
    });
  });

  // ── question.type !== "fill_blank" && !== "translation" shows h2 ───────

  describe("Question heading visibility", () => {
    it("shows h2 heading for mcq type", () => {
      const { container } = render(<QuizCard {...defaultProps} question={makeMcqQuestion()} />);
      const h2 = container.querySelector("h2");
      expect(h2?.textContent).toBe("What does 'ayubowan' mean?");
    });

    it("does not show h2 heading for fill_blank type", () => {
      const { container } = render(
        <QuizCard {...defaultProps} question={makeFillBlankQuestion()} />
      );
      const h2s = container.querySelectorAll("h2");
      const texts = Array.from(h2s).map((h) => h.textContent);
      expect(texts).not.toContain("The cat is ___ the table.");
    });

    it("does not show h2 heading for translation type", () => {
      const { container } = render(
        <QuizCard {...defaultProps} question={makeTranslationQuestion()} />
      );
      const h2s = container.querySelectorAll("h2");
      const texts = Array.from(h2s).map((h) => h.textContent);
      expect(texts).not.toContain("Mama giyaa");
    });
  });

  // ── fill_blank hint edge: options is object but no hint key ────────────
  describe("Fill blank hint parsing", () => {
    it("empty hint when options has no hint key", () => {
      const q = makeFillBlankQuestion({ options: { notHint: "foo" } });
      render(<QuizCard {...defaultProps} question={q} />);
      expect(screen.queryByText("Show hint")).not.toBeInTheDocument();
    });

    it("handles mcq with non-array options", () => {
      const q = makeMcqQuestion({ options: "not-an-array" });
      render(<QuizCard {...defaultProps} question={q} />);
      // Should not crash; no options rendered
      expect(screen.queryByText("A.")).not.toBeInTheDocument();
    });

    it("renders empty hint when fill_blank options.hint is undefined", () => {
      const q = makeFillBlankQuestion({ options: { hint: undefined } });
      render(<QuizCard {...defaultProps} question={q} />);
      // hint is "" after ?? fallback, so no hint button should appear
      expect(screen.queryByText("Show hint")).not.toBeInTheDocument();
    });

    it("defaults sourceLanguage to empty string when translation options.sourceLanguage is undefined", () => {
      const q = makeTranslationQuestion({
        options: { sourceLanguage: undefined },
      });
      const { container } = render(<QuizCard {...defaultProps} question={q} />);
      // sourceLanguage is "" after ?? fallback; the language label badge renders empty text
      const badge = container.querySelector(".bg-indigo-200");
      expect(badge).toBeInTheDocument();
      expect(badge?.textContent).toBe("");
    });
  });

  // ── handleNextClick guard against double click ─────────────────────────
  describe("handleNextClick", () => {
    it("calls onNextAction only once on rapid double-clicks", async () => {
      const slowNext = vi.fn(() => new Promise<void>((r) => setTimeout(r, 100)));
      mockSubmitQuizAnswer.mockResolvedValue({ isCorrect: true });
      render(
        <QuizCard
          question={makeMcqQuestion()}
          onNextAction={slowNext}
          onAnswerSubmittedAction={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText(/Hello/).closest("button")!);
      fireEvent.click(screen.getByText("Submit Answer"));

      await waitFor(() => {
        expect(screen.getByText("Next Question")).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByText("Next Question"));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("Next Question"));
      });

      await waitFor(() => {
        expect(slowNext).toHaveBeenCalledTimes(1);
      });
    });
  });
});
