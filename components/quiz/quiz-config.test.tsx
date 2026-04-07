import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ── Mocks ──────────────────────────────────────────────────────────────────

const { mockPush, mockToast, mockSetAdaptiveRecommendation, mockAdaptiveRecommendation } =
  vi.hoisted(() => ({
    mockPush: vi.fn(),
    mockToast: { error: vi.fn(), success: vi.fn() },
    mockSetAdaptiveRecommendation: vi.fn(),
    mockAdaptiveRecommendation: { value: null as any },
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({ toast: mockToast }));

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

vi.mock("@/components/loader", () => ({
  Loader: () => <div data-testid="custom-loader" />,
}));

vi.mock("@/store/quiz-store", () => ({
  useQuizStore: (selector: any) => {
    const state = {
      adaptiveRecommendation: mockAdaptiveRecommendation.value,
      setAdaptiveRecommendation: mockSetAdaptiveRecommendation,
    };
    return selector(state);
  },
}));

vi.mock("@/lib/adaptive-difficulty", () => ({
  computeAdaptiveDifficultyRecommendation: vi.fn(() => null),
  getBaselineDifficulty: vi.fn(() => "beginner" as const),
}));

import { QuizConfig } from "./quiz-config";
import { computeAdaptiveDifficultyRecommendation } from "@/lib/adaptive-difficulty";

// ── Helpers ────────────────────────────────────────────────────────────────

beforeAll(() => {
  window.scrollTo = vi.fn() as any;
});

const makeUnits = () => [
  {
    id: 1,
    title: "Greetings",
    description: "Basic greetings in Sinhala",
    order: 1,
    courseId: 1,
    lessons: [
      { id: 1, completed: true },
      { id: 2, completed: false },
    ],
  },
  {
    id: 2,
    title: "Numbers",
    description: "Counting in Sinhala",
    order: 2,
    courseId: 1,
    lessons: [{ id: 3, completed: false }],
  },
];

describe("QuizConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdaptiveRecommendation.value = null;
    (computeAdaptiveDifficultyRecommendation as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  // ── Rendering ──────────────────────────────────────────────────────────

  it("renders topic selection heading", () => {
    render(<QuizConfig units={makeUnits()} />);
    expect(screen.getByText("Select Topic")).toBeInTheDocument();
  });

  it("renders all units as topic cards", () => {
    render(<QuizConfig units={makeUnits()} />);
    expect(screen.getByText("Greetings")).toBeInTheDocument();
    expect(screen.getByText("Numbers")).toBeInTheDocument();
    expect(screen.getByText("Basic greetings in Sinhala")).toBeInTheDocument();
  });

  it("renders lesson count with correct plural", () => {
    render(<QuizConfig units={makeUnits()} />);
    expect(screen.getByText("2 lessons available")).toBeInTheDocument();
    expect(screen.getByText("1 lesson available")).toBeInTheDocument();
  });

  it("renders difficulty options", () => {
    render(<QuizConfig units={makeUnits()} />);
    expect(screen.getByText("beginner")).toBeInTheDocument();
    expect(screen.getByText("intermediate")).toBeInTheDocument();
    expect(screen.getByText("advanced")).toBeInTheDocument();
  });

  it("renders difficulty descriptions", () => {
    render(<QuizConfig units={makeUnits()} />);
    expect(screen.getByText("Simple vocabulary and basic phrases")).toBeInTheDocument();
    expect(screen.getByText("Sentence construction and grammar")).toBeInTheDocument();
    expect(screen.getByText("Complex conversations and idioms")).toBeInTheDocument();
  });

  it("renders question count options", () => {
    render(<QuizConfig units={makeUnits()} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("renders question type checkboxes", () => {
    render(<QuizConfig units={makeUnits()} />);
    expect(screen.getByText("MCQ")).toBeInTheDocument();
    expect(screen.getByText("Fill-in-the-blank")).toBeInTheDocument();
    expect(screen.getByText("Translation")).toBeInTheDocument();
  });

  it("renders Start Quiz button", () => {
    render(<QuizConfig units={makeUnits()} />);
    expect(screen.getByText("Start Quiz")).toBeInTheDocument();
  });

  // ── Topic selection ────────────────────────────────────────────────────

  it("selects topic on click", () => {
    render(<QuizConfig units={makeUnits()} />);
    const greetingsBtn = screen.getByText("Greetings").closest("button")!;
    fireEvent.click(greetingsBtn);
    expect(greetingsBtn).toHaveAttribute("aria-pressed", "true");
  });

  // ── Difficulty selection ───────────────────────────────────────────────

  it("changes difficulty on click", () => {
    render(<QuizConfig units={makeUnits()} />);
    const advancedBtn = screen.getByText("advanced").closest("button")!;
    fireEvent.click(advancedBtn);
    expect(advancedBtn).toHaveAttribute("aria-pressed", "true");
  });

  // ── Question count ─────────────────────────────────────────────────────

  it("changes question count on click", () => {
    render(<QuizConfig units={makeUnits()} />);
    const fiveBtn = screen.getByLabelText("5 questions");
    fireEvent.click(fiveBtn);
    expect(fiveBtn).toHaveAttribute("aria-pressed", "true");
  });

  // ── Question types toggle ──────────────────────────────────────────────

  it("toggles question types", () => {
    render(<QuizConfig units={makeUnits()} />);
    const mcqCheckbox = screen.getByRole("checkbox", { name: /MCQ/i });
    expect(mcqCheckbox).toBeChecked();
    fireEvent.click(mcqCheckbox);
    expect(mcqCheckbox).not.toBeChecked();
    // Toggle back
    fireEvent.click(mcqCheckbox);
    expect(mcqCheckbox).toBeChecked();
  });

  // ── Start Quiz ─────────────────────────────────────────────────────────

  it("disables start button when no topic is selected", () => {
    render(<QuizConfig units={makeUnits()} />);
    const startBtn = screen.getByText("Start Quiz");
    expect(startBtn).toBeDisabled();
  });

  it("disables start button when no question types selected", () => {
    render(<QuizConfig units={makeUnits()} />);
    // Select topic
    fireEvent.click(screen.getByText("Greetings").closest("button")!);
    // Uncheck all question types
    fireEvent.click(screen.getByRole("checkbox", { name: /MCQ/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Fill-in-the-blank/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Translation/i }));

    const startBtn = screen.getByText("Start Quiz");
    expect(startBtn).toBeDisabled();
  });

  it("successfully starts quiz and navigates", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ sessionId: 42 })),
    });
    global.fetch = mockFetch;

    render(<QuizConfig units={makeUnits()} />);
    fireEvent.click(screen.getByText("Greetings").closest("button")!);
    fireEvent.click(screen.getByText("Start Quiz"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/quiz/generate",
        expect.objectContaining({ method: "POST", credentials: "include" })
      );
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Quiz generated successfully!");
      expect(mockPush).toHaveBeenCalledWith("/quiz?sessionId=42");
    });
  });

  it("uses custom basePath when provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ sessionId: 99 })),
    });
    global.fetch = mockFetch;

    render(<QuizConfig units={makeUnits()} basePath="/custom-quiz" />);
    fireEvent.click(screen.getByText("Greetings").closest("button")!);
    fireEvent.click(screen.getByText("Start Quiz"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/custom-quiz?sessionId=99");
    });
  });

  it("shows error when fetch fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve(JSON.stringify({ error: "Server error" })),
    });
    global.fetch = mockFetch;

    render(<QuizConfig units={makeUnits()} />);
    fireEvent.click(screen.getByText("Greetings").closest("button")!);
    fireEvent.click(screen.getByText("Start Quiz"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Server error");
    });
  });

  it("shows generic error when fetch throws", async () => {
    const mockFetch = vi.fn().mockRejectedValue("boom");
    global.fetch = mockFetch;

    render(<QuizConfig units={makeUnits()} />);
    fireEvent.click(screen.getByText("Greetings").closest("button")!);
    fireEvent.click(screen.getByText("Start Quiz"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to start quiz");
    });
  });

  it("shows error when fetch fails with Error instance", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Connection refused"));
    global.fetch = mockFetch;

    render(<QuizConfig units={makeUnits()} />);
    fireEvent.click(screen.getByText("Greetings").closest("button")!);
    fireEvent.click(screen.getByText("Start Quiz"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Connection refused");
    });
  });

  it("shows error when missing sessionId in response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({})),
    });
    global.fetch = mockFetch;

    render(<QuizConfig units={makeUnits()} />);
    fireEvent.click(screen.getByText("Greetings").closest("button")!);
    fireEvent.click(screen.getByText("Start Quiz"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to start quiz: missing session ID");
    });
  });

  it("shows loading state while generating quiz", async () => {
    let resolveText: (v: string) => void;
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        new Promise<string>((resolve) => {
          resolveText = resolve;
        }),
    });
    global.fetch = mockFetch;

    render(<QuizConfig units={makeUnits()} />);
    fireEvent.click(screen.getByText("Greetings").closest("button")!);
    fireEvent.click(screen.getByText("Start Quiz"));

    await waitFor(() => {
      expect(screen.getByText("Generating Quiz...")).toBeInTheDocument();
      expect(screen.getByTestId("custom-loader")).toBeInTheDocument();
      expect(screen.getByText("Generating your quiz...")).toBeInTheDocument();
      expect(screen.getByText("This may take a few seconds")).toBeInTheDocument();
    });

    resolveText!(JSON.stringify({ sessionId: 1 }));

    await waitFor(() => {
      expect(screen.getByText("Start Quiz")).toBeInTheDocument();
    });
  });

  it("shows error when selected unit is not found (edge case)", async () => {
    // This tests the handleStartQuiz guard: selectedUnit not found
    // We select a topic, then manipulate units to not include it
    const units = makeUnits();
    const { rerender } = render(<QuizConfig units={units} />);
    fireEvent.click(screen.getByText("Greetings").closest("button")!);
    // Rerender with units that don't have id=1
    rerender(<QuizConfig units={[units[1]]} />);
    fireEvent.click(screen.getByText("Start Quiz"));
    expect(mockToast.error).toHaveBeenCalledWith("Selected topic not found");
  });

  // ── Keyboard navigation ────────────────────────────────────────────────

  describe("Keyboard navigation", () => {
    it("navigates difficulty with ArrowRight", () => {
      render(<QuizConfig units={makeUnits()} />);
      const beginnerBtn = screen.getByText("beginner").closest("button")!;
      fireEvent.keyDown(beginnerBtn, { key: "ArrowRight" });
      const intermediateBtn = screen.getByText("intermediate").closest("button")!;
      expect(intermediateBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("navigates difficulty with ArrowLeft wraps to end", () => {
      render(<QuizConfig units={makeUnits()} />);
      const beginnerBtn = screen.getByText("beginner").closest("button")!;
      fireEvent.keyDown(beginnerBtn, { key: "ArrowLeft" });
      const advancedBtn = screen.getByText("advanced").closest("button")!;
      expect(advancedBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("navigates difficulty with ArrowDown", () => {
      render(<QuizConfig units={makeUnits()} />);
      const beginnerBtn = screen.getByText("beginner").closest("button")!;
      fireEvent.keyDown(beginnerBtn, { key: "ArrowDown" });
      const intermediateBtn = screen.getByText("intermediate").closest("button")!;
      expect(intermediateBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("navigates difficulty with ArrowUp", () => {
      render(<QuizConfig units={makeUnits()} />);
      // First go to intermediate
      fireEvent.click(screen.getByText("intermediate").closest("button")!);
      const intermediateBtn = screen.getByText("intermediate").closest("button")!;
      fireEvent.keyDown(intermediateBtn, { key: "ArrowUp" });
      const beginnerBtn = screen.getByText("beginner").closest("button")!;
      expect(beginnerBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("navigates difficulty with Home key", () => {
      render(<QuizConfig units={makeUnits()} />);
      fireEvent.click(screen.getByText("advanced").closest("button")!);
      const advancedBtn = screen.getByText("advanced").closest("button")!;
      fireEvent.keyDown(advancedBtn, { key: "Home" });
      expect(screen.getByText("beginner").closest("button")!).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });

    it("navigates difficulty with End key", () => {
      render(<QuizConfig units={makeUnits()} />);
      const beginnerBtn = screen.getByText("beginner").closest("button")!;
      fireEvent.keyDown(beginnerBtn, { key: "End" });
      expect(screen.getByText("advanced").closest("button")!).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });

    it("does not change value for unrecognized keys", () => {
      render(<QuizConfig units={makeUnits()} />);
      const beginnerBtn = screen.getByText("beginner").closest("button")!;
      fireEvent.keyDown(beginnerBtn, { key: "Enter" });
      expect(beginnerBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("navigates question count with ArrowRight wraps", () => {
      render(<QuizConfig units={makeUnits()} />);
      // Default is 10, go to 15
      const tenBtn = screen.getByLabelText("10 questions");
      fireEvent.keyDown(tenBtn, { key: "ArrowRight" });
      expect(screen.getByLabelText("15 questions")).toHaveAttribute("aria-pressed", "true");

      // Go past end wraps to 5
      const fifteenBtn = screen.getByLabelText("15 questions");
      fireEvent.keyDown(fifteenBtn, { key: "ArrowRight" });
      expect(screen.getByLabelText("5 questions")).toHaveAttribute("aria-pressed", "true");
    });

    it("topic keyboard navigation when nothing is selected", () => {
      render(<QuizConfig units={makeUnits()} />);
      const greetingsBtn = screen.getByText("Greetings").closest("button")!;

      // ArrowRight with nothing selected should select first
      fireEvent.keyDown(greetingsBtn, { key: "ArrowRight" });
      expect(greetingsBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("topic keyboard navigation with End when nothing selected", () => {
      render(<QuizConfig units={makeUnits()} />);
      const greetingsBtn = screen.getByText("Greetings").closest("button")!;
      fireEvent.keyDown(greetingsBtn, { key: "End" });
      const numbersBtn = screen.getByText("Numbers").closest("button")!;
      expect(numbersBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("topic keyboard navigation with ArrowDown when nothing selected", () => {
      render(<QuizConfig units={makeUnits()} />);
      const greetingsBtn = screen.getByText("Greetings").closest("button")!;
      fireEvent.keyDown(greetingsBtn, { key: "ArrowDown" });
      expect(greetingsBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("topic keyboard navigation with Home when nothing selected", () => {
      render(<QuizConfig units={makeUnits()} />);
      const greetingsBtn = screen.getByText("Greetings").closest("button")!;
      fireEvent.keyDown(greetingsBtn, { key: "Home" });
      expect(greetingsBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("topic keyboard navigation with selected topic (ArrowRight)", () => {
      render(<QuizConfig units={makeUnits()} />);
      const greetingsBtn = screen.getByText("Greetings").closest("button")!;
      fireEvent.click(greetingsBtn);
      fireEvent.keyDown(greetingsBtn, { key: "ArrowRight" });
      expect(screen.getByText("Numbers").closest("button")!).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });

    it("ignores unrelated keys when topic is selected", () => {
      render(<QuizConfig units={makeUnits()} />);
      const greetingsBtn = screen.getByText("Greetings").closest("button")!;
      fireEvent.click(greetingsBtn);
      fireEvent.keyDown(greetingsBtn, { key: "Tab" });
      expect(greetingsBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("ignores unrelated keys when nothing is selected", () => {
      render(<QuizConfig units={makeUnits()} />);
      const greetingsBtn = screen.getByText("Greetings").closest("button")!;
      fireEvent.keyDown(greetingsBtn, { key: "Tab" });
      expect(greetingsBtn).toHaveAttribute("aria-pressed", "false");
    });
  });

  // ── Adaptive recommendation ────────────────────────────────────────────

  describe("Adaptive recommendation", () => {
    it("shows adaptive recommendation when topic matches", () => {
      mockAdaptiveRecommendation.value = {
        topicTitle: "Greetings",
        averageScore: 85,
        sessionCount: 3,
        recommendedDifficulty: "intermediate",
        message: "Try harder!",
      };

      render(<QuizConfig units={makeUnits()} />);
      fireEvent.click(screen.getByText("Greetings").closest("button")!);

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText(/Intermediate/)).toBeInTheDocument();
    });

    it("does not show recommendation when topic doesn't match", () => {
      mockAdaptiveRecommendation.value = {
        topicTitle: "Different Topic",
        averageScore: 85,
        sessionCount: 3,
        recommendedDifficulty: "intermediate",
        message: "Try harder!",
      };

      render(<QuizConfig units={makeUnits()} />);
      fireEvent.click(screen.getByText("Greetings").closest("button")!);

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("clears recommendation when no topic selected", () => {
      render(<QuizConfig units={makeUnits()} />);
      // No topic selected
      expect(mockSetAdaptiveRecommendation).toHaveBeenCalledWith(null);
    });

    it("calls computeAdaptiveDifficultyRecommendation when topic selected", () => {
      render(<QuizConfig units={makeUnits()} />);
      fireEvent.click(screen.getByText("Greetings").closest("button")!);
      expect(computeAdaptiveDifficultyRecommendation).toHaveBeenCalled();
    });

    it("clears recommendation when selected unit not found", () => {
      // Select topic first with normal units
      const units = makeUnits();
      const { rerender } = render(<QuizConfig units={units} />);
      fireEvent.click(screen.getByText("Greetings").closest("button")!);
      // Now render with empty units (topic ID is still selected but unit is gone)
      rerender(<QuizConfig units={[]} />);
      expect(mockSetAdaptiveRecommendation).toHaveBeenCalledWith(null);
    });
  });

  // ── Error response without .error field ────────────────────────────────

  it("uses default error message when response has no error field", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve(JSON.stringify({})),
    });
    global.fetch = mockFetch;

    render(<QuizConfig units={makeUnits()} />);
    fireEvent.click(screen.getByText("Greetings").closest("button")!);
    fireEvent.click(screen.getByText("Start Quiz"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to generate quiz");
    });
  });

  it("shows HTTP hint when error response body is not JSON", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve("<!DOCTYPE html><html></html>"),
    });
    global.fetch = mockFetch;

    render(<QuizConfig units={makeUnits()} />);
    fireEvent.click(screen.getByText("Greetings").closest("button")!);
    fireEvent.click(screen.getByText("Start Quiz"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Could not start quiz (HTTP 404). Try refreshing or signing in again."
      );
    });
  });

  it("shows invalid server message when success body is not JSON", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("not-json"),
    });
    global.fetch = mockFetch;

    render(<QuizConfig units={makeUnits()} />);
    fireEvent.click(screen.getByText("Greetings").closest("button")!);
    fireEvent.click(screen.getByText("Start Quiz"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Invalid response from the quiz server.");
    });
  });

  it("accepts string sessionId from API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ sessionId: "99" })),
    });
    global.fetch = mockFetch;

    render(<QuizConfig units={makeUnits()} />);
    fireEvent.click(screen.getByText("Greetings").closest("button")!);
    fireEvent.click(screen.getByText("Start Quiz"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/quiz?sessionId=99");
    });
  });

  it("uses default error when error field is not a string", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve(JSON.stringify({ error: 503 })),
    });
    global.fetch = mockFetch;

    render(<QuizConfig units={makeUnits()} />);
    fireEvent.click(screen.getByText("Greetings").closest("button")!);
    fireEvent.click(screen.getByText("Start Quiz"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to generate quiz");
    });
  });

  it("treats empty response body as missing session when ok", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });
    global.fetch = mockFetch;

    render(<QuizConfig units={makeUnits()} />);
    fireEvent.click(screen.getByText("Greetings").closest("button")!);
    fireEvent.click(screen.getByText("Start Quiz"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to start quiz: missing session ID");
    });
  });

  // ── tabIndex ───────────────────────────────────────────────────────────

  it("sets correct tabIndex on topic buttons", () => {
    render(<QuizConfig units={makeUnits()} />);
    const greetingsBtn = screen.getByText("Greetings").closest("button")!;
    const numbersBtn = screen.getByText("Numbers").closest("button")!;
    // When nothing selected, first button should be tabbable
    expect(greetingsBtn).toHaveAttribute("tabindex", "0");
    expect(numbersBtn).toHaveAttribute("tabindex", "-1");
  });

  it("sets correct tabIndex when topic is selected", () => {
    render(<QuizConfig units={makeUnits()} />);
    fireEvent.click(screen.getByText("Numbers").closest("button")!);
    const greetingsBtn = screen.getByText("Greetings").closest("button")!;
    const numbersBtn = screen.getByText("Numbers").closest("button")!;
    expect(greetingsBtn).toHaveAttribute("tabindex", "-1");
    expect(numbersBtn).toHaveAttribute("tabindex", "0");
  });
});
