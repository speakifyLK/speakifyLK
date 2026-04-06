import { describe, it, expect, beforeEach } from "vitest";

import { useQuizStore } from "./quiz-store";

const sampleQuestions = [
  {
    id: 1,
    question: "What is 'hello'?",
    options: ["A", "B", "C"],
    correctAnswer: "A",
  },
  {
    id: 2,
    question: "What is 'bye'?",
    options: ["X", "Y", "Z"],
    correctAnswer: "Y",
  },
  {
    id: 3,
    question: "What is 'thanks'?",
    options: ["P", "Q", "R"],
    correctAnswer: "R",
  },
];

describe("quiz-store", () => {
  beforeEach(() => {
    // Reset to initial state before each test
    useQuizStore.getState().resetQuiz();
  });

  // ── Initial state ────────────────────────────────────────────────────
  it("has correct initial state", () => {
    const state = useQuizStore.getState();
    expect(state.currentSessionId).toBeNull();
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.questions).toEqual([]);
    expect(state.selectedAnswer).toBeNull();
    expect(state.isAnswerSubmitted).toBe(false);
    expect(state.score).toBe(0);
    expect(state.timeRemaining).toBe(0);
    expect(state.isQuizActive).toBe(false);
    expect(state.difficulty).toBe("easy");
    expect(state.adaptiveRecommendation).toBeNull();
  });

  // ── setAdaptiveRecommendation ────────────────────────────────────────
  it("sets adaptive recommendation", () => {
    const recommendation = {
      topicTitle: "Greetings",
      averageScore: 85,
      sessionCount: 5,
      recommendedDifficulty: "advanced" as const,
      message: "User is doing well",
    };
    useQuizStore.getState().setAdaptiveRecommendation(recommendation);
    expect(useQuizStore.getState().adaptiveRecommendation).toEqual(recommendation);
  });

  it("clears adaptive recommendation with null", () => {
    useQuizStore.getState().setAdaptiveRecommendation({
      topicTitle: "Basics",
      averageScore: 50,
      sessionCount: 2,
      recommendedDifficulty: "beginner" as const,
      message: "test",
    });
    useQuizStore.getState().setAdaptiveRecommendation(null);
    expect(useQuizStore.getState().adaptiveRecommendation).toBeNull();
  });

  // ── resetTimer ───────────────────────────────────────────────────────
  it("sets time remaining and marks the quiz active", () => {
    useQuizStore.getState().resetQuiz();
    useQuizStore.getState().resetTimer(42);
    const state = useQuizStore.getState();
    expect(state.timeRemaining).toBe(42);
    expect(state.isQuizActive).toBe(true);
  });

  // ── startQuiz ────────────────────────────────────────────────────────
  it("starts quiz with positive time (isQuizActive = true)", () => {
    useQuizStore.getState().startQuiz(42, sampleQuestions, "hard", 120);

    const state = useQuizStore.getState();
    expect(state.currentSessionId).toBe(42);
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.questions).toEqual(sampleQuestions);
    expect(state.selectedAnswer).toBeNull();
    expect(state.isAnswerSubmitted).toBe(false);
    expect(state.score).toBe(0);
    expect(state.timeRemaining).toBe(120);
    expect(state.isQuizActive).toBe(true);
    expect(state.difficulty).toBe("hard");
    expect(state.adaptiveRecommendation).toBeNull();
  });

  it("starts quiz with zero time (isQuizActive = false)", () => {
    useQuizStore.getState().startQuiz(1, sampleQuestions, "easy", 0);
    const state = useQuizStore.getState();
    expect(state.timeRemaining).toBe(0);
    expect(state.isQuizActive).toBe(false);
  });

  it("starts quiz with default difficulty and time", () => {
    useQuizStore.getState().startQuiz(1, sampleQuestions);
    const state = useQuizStore.getState();
    expect(state.difficulty).toBe("easy");
    expect(state.timeRemaining).toBe(0);
    expect(state.isQuizActive).toBe(false);
  });

  it("starts quiz with negative time (treated as non-positive)", () => {
    useQuizStore.getState().startQuiz(1, sampleQuestions, "medium", -5);
    const state = useQuizStore.getState();
    expect(state.timeRemaining).toBe(0);
    expect(state.isQuizActive).toBe(false);
  });

  it("clears previous adaptive recommendation on startQuiz", () => {
    useQuizStore.getState().setAdaptiveRecommendation({
      topicTitle: "Numbers",
      averageScore: 90,
      sessionCount: 3,
      recommendedDifficulty: "advanced" as const,
      message: "test",
    });
    useQuizStore.getState().startQuiz(1, sampleQuestions, "easy", 60);
    expect(useQuizStore.getState().adaptiveRecommendation).toBeNull();
  });

  // ── selectAnswer ─────────────────────────────────────────────────────
  it("selects an answer", () => {
    useQuizStore.getState().startQuiz(1, sampleQuestions, "easy", 60);
    useQuizStore.getState().selectAnswer("A");
    expect(useQuizStore.getState().selectedAnswer).toBe("A");
  });

  it("ignores selectAnswer after answer is submitted", () => {
    useQuizStore.getState().startQuiz(1, sampleQuestions, "easy", 60);
    useQuizStore.getState().selectAnswer("A");
    useQuizStore.getState().submitAnswer();
    useQuizStore.getState().selectAnswer("B");
    expect(useQuizStore.getState().selectedAnswer).toBe("A");
  });

  // ── submitAnswer ─────────────────────────────────────────────────────
  it("submits a correct answer and increments score", () => {
    useQuizStore.getState().startQuiz(1, sampleQuestions, "easy", 60);
    useQuizStore.getState().selectAnswer("A"); // correct
    useQuizStore.getState().submitAnswer();
    const state = useQuizStore.getState();
    expect(state.isAnswerSubmitted).toBe(true);
    expect(state.score).toBe(1);
  });

  it("submits an incorrect answer and does not increment score", () => {
    useQuizStore.getState().startQuiz(1, sampleQuestions, "easy", 60);
    useQuizStore.getState().selectAnswer("B"); // incorrect
    useQuizStore.getState().submitAnswer();
    const state = useQuizStore.getState();
    expect(state.isAnswerSubmitted).toBe(true);
    expect(state.score).toBe(0);
  });

  it("submits with no selected answer (selectedAnswer is null)", () => {
    useQuizStore.getState().startQuiz(1, sampleQuestions, "easy", 60);
    // no selectAnswer call
    useQuizStore.getState().submitAnswer();
    const state = useQuizStore.getState();
    expect(state.isAnswerSubmitted).toBe(true);
    expect(state.score).toBe(0);
  });

  it("ignores submit when already submitted", () => {
    useQuizStore.getState().startQuiz(1, sampleQuestions, "easy", 60);
    useQuizStore.getState().selectAnswer("A");
    useQuizStore.getState().submitAnswer();
    useQuizStore.getState().submitAnswer(); // second call
    expect(useQuizStore.getState().score).toBe(1); // not incremented twice
  });

  it("ignores submit when quiz is not active", () => {
    // Quiz started with 0 time → isQuizActive = false
    useQuizStore.getState().startQuiz(1, sampleQuestions, "easy", 0);
    useQuizStore.getState().selectAnswer("A");
    useQuizStore.getState().submitAnswer();
    expect(useQuizStore.getState().isAnswerSubmitted).toBe(false);
    expect(useQuizStore.getState().score).toBe(0);
  });

  it("handles submit when currentQuestion is undefined (index out of bounds)", () => {
    useQuizStore.getState().startQuiz(1, [], "easy", 60);
    useQuizStore.getState().submitAnswer();
    const state = useQuizStore.getState();
    expect(state.isAnswerSubmitted).toBe(true);
    expect(state.isQuizActive).toBe(false);
  });

  // ── nextQuestion ─────────────────────────────────────────────────────
  it("moves to the next question", () => {
    useQuizStore.getState().startQuiz(1, sampleQuestions, "easy", 60);
    useQuizStore.getState().selectAnswer("A");
    useQuizStore.getState().submitAnswer();
    useQuizStore.getState().nextQuestion();

    const state = useQuizStore.getState();
    expect(state.currentQuestionIndex).toBe(1);
    expect(state.selectedAnswer).toBeNull();
    expect(state.isAnswerSubmitted).toBe(false);
  });

  it("deactivates quiz when no more questions", () => {
    useQuizStore.getState().startQuiz(1, [sampleQuestions[0]], "easy", 60);
    useQuizStore.getState().selectAnswer("A");
    useQuizStore.getState().submitAnswer();
    useQuizStore.getState().nextQuestion(); // only 1 question, no more

    const state = useQuizStore.getState();
    expect(state.isQuizActive).toBe(false);
  });

  // ── completeQuiz ─────────────────────────────────────────────────────
  it("completes quiz (sets isQuizActive to false)", () => {
    useQuizStore.getState().startQuiz(1, sampleQuestions, "easy", 60);
    expect(useQuizStore.getState().isQuizActive).toBe(true);

    useQuizStore.getState().completeQuiz();
    expect(useQuizStore.getState().isQuizActive).toBe(false);
  });

  // ── resetQuiz ────────────────────────────────────────────────────────
  it("resets quiz to initial state", () => {
    useQuizStore.getState().startQuiz(1, sampleQuestions, "hard", 120);
    useQuizStore.getState().selectAnswer("A");
    useQuizStore.getState().submitAnswer();

    useQuizStore.getState().resetQuiz();

    const state = useQuizStore.getState();
    expect(state.currentSessionId).toBeNull();
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.questions).toEqual([]);
    expect(state.selectedAnswer).toBeNull();
    expect(state.isAnswerSubmitted).toBe(false);
    expect(state.score).toBe(0);
    expect(state.timeRemaining).toBe(0);
    expect(state.isQuizActive).toBe(false);
    expect(state.difficulty).toBe("easy");
    expect(state.adaptiveRecommendation).toBeNull();
  });

  // ── decrementTimer ───────────────────────────────────────────────────
  it("decrements timer by 1", () => {
    useQuizStore.getState().startQuiz(1, sampleQuestions, "easy", 60);
    useQuizStore.getState().decrementTimer();
    expect(useQuizStore.getState().timeRemaining).toBe(59);
  });

  it("auto-completes quiz when timer reaches 0", () => {
    useQuizStore.getState().startQuiz(1, sampleQuestions, "easy", 1);
    useQuizStore.getState().decrementTimer();

    const state = useQuizStore.getState();
    expect(state.timeRemaining).toBe(0);
    expect(state.isQuizActive).toBe(false);
  });

  it("ignores decrement when quiz is not active", () => {
    useQuizStore.getState().startQuiz(1, sampleQuestions, "easy", 0);
    useQuizStore.getState().decrementTimer();
    expect(useQuizStore.getState().timeRemaining).toBe(0);
  });

  it("ignores decrement when timer is already 0", () => {
    useQuizStore.getState().startQuiz(1, sampleQuestions, "easy", 60);
    useQuizStore.getState().completeQuiz(); // deactivate
    useQuizStore.getState().decrementTimer();
    expect(useQuizStore.getState().timeRemaining).toBe(60);
  });

  // ── Full quiz flow integration ───────────────────────────────────────
  it("supports a full quiz flow: start → answer → next → complete", () => {
    useQuizStore.getState().startQuiz(99, sampleQuestions, "medium", 300);

    // Question 1: correct
    useQuizStore.getState().selectAnswer("A");
    useQuizStore.getState().submitAnswer();
    expect(useQuizStore.getState().score).toBe(1);
    useQuizStore.getState().nextQuestion();

    // Question 2: incorrect
    useQuizStore.getState().selectAnswer("X");
    useQuizStore.getState().submitAnswer();
    expect(useQuizStore.getState().score).toBe(1);
    useQuizStore.getState().nextQuestion();

    // Question 3: correct
    useQuizStore.getState().selectAnswer("R");
    useQuizStore.getState().submitAnswer();
    expect(useQuizStore.getState().score).toBe(2);
    useQuizStore.getState().nextQuestion(); // no more questions

    expect(useQuizStore.getState().isQuizActive).toBe(false);
  });
});
