import { create } from "zustand";

import type { AdaptiveDifficultyRecommendation } from "@/lib/adaptive-difficulty";

type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  // Extend with any extra metadata your AI quiz provides
  [key: string]: unknown;
};

type Difficulty = "easy" | "medium" | "hard" | (string & {});

type QuizState = {
  currentSessionId: number | null;
  currentQuestionIndex: number;
  questions: QuizQuestion[];
  selectedAnswer: string | null;
  isAnswerSubmitted: boolean;
  score: number;
  timeRemaining: number;
  isQuizActive: boolean;
  difficulty: Difficulty;
  adaptiveRecommendation: AdaptiveDifficultyRecommendation | null;

  setAdaptiveRecommendation: (recommendation: AdaptiveDifficultyRecommendation | null) => void;
  resetTimer: (seconds: number) => void;
  startQuiz: (
    sessionId: number,
    questions: QuizQuestion[],
    difficulty?: Difficulty,
    initialTimeSeconds?: number
  ) => void;
  selectAnswer: (answer: string) => void;
  submitAnswer: () => void;
  nextQuestion: () => void;
  completeQuiz: () => void;
  resetQuiz: () => void;
  decrementTimer: () => void;
};

export const useQuizStore = create<QuizState>((set) => ({
  currentSessionId: null,
  currentQuestionIndex: 0,
  questions: [],
  selectedAnswer: null,
  isAnswerSubmitted: false,
  score: 0,
  timeRemaining: 0,
  isQuizActive: false,
  difficulty: "easy",
  adaptiveRecommendation: null,

  setAdaptiveRecommendation: (recommendation) => set({ adaptiveRecommendation: recommendation }),

  resetTimer: (seconds) => set({ timeRemaining: seconds, isQuizActive: true }),

  startQuiz: (sessionId, questions, difficulty = "easy", initialTimeSeconds = 0) => {
    const hasPositiveTime = initialTimeSeconds > 0;
    return set({
      currentSessionId: sessionId,
      currentQuestionIndex: 0,
      questions,
      selectedAnswer: null,
      isAnswerSubmitted: false,
      score: 0,
      timeRemaining: hasPositiveTime ? initialTimeSeconds : 0,
      isQuizActive: hasPositiveTime,
      difficulty,
      adaptiveRecommendation: null,
    });
  },

  selectAnswer: (answer) =>
    set((state) => {
      if (state.isAnswerSubmitted) {
        return state;
      }
      return {
        ...state,
        selectedAnswer: answer,
      };
    }),

  submitAnswer: () =>
    set((state) => {
      if (state.isAnswerSubmitted || !state.isQuizActive) {
        return state;
      }

      const currentQuestion = state.questions[state.currentQuestionIndex];

      if (!currentQuestion) {
        return {
          ...state,
          isAnswerSubmitted: true,
          isQuizActive: false,
        };
      }

      const isCorrect =
        state.selectedAnswer !== null && state.selectedAnswer === currentQuestion.correctAnswer;

      return {
        ...state,
        isAnswerSubmitted: true,
        score: isCorrect ? state.score + 1 : state.score,
      };
    }),

  nextQuestion: () =>
    set((state) => {
      const hasMoreQuestions = state.currentQuestionIndex + 1 < state.questions.length;

      if (!hasMoreQuestions) {
        return {
          ...state,
          isQuizActive: false,
        };
      }

      return {
        ...state,
        currentQuestionIndex: state.currentQuestionIndex + 1,
        selectedAnswer: null,
        isAnswerSubmitted: false,
      };
    }),

  completeQuiz: () =>
    set((state) => ({
      ...state,
      isQuizActive: false,
    })),

  resetQuiz: () =>
    set({
      currentSessionId: null,
      currentQuestionIndex: 0,
      questions: [],
      selectedAnswer: null,
      isAnswerSubmitted: false,
      score: 0,
      timeRemaining: 0,
      isQuizActive: false,
      difficulty: "easy",
      adaptiveRecommendation: null,
    }),

  decrementTimer: () =>
    set((state) => {
      if (!state.isQuizActive || state.timeRemaining <= 0) {
        return state;
      }

      const nextTime = state.timeRemaining - 1;

      if (nextTime <= 0) {
        // Auto-complete quiz when timer runs out
        return {
          ...state,
          timeRemaining: 0,
          isQuizActive: false,
        };
      }

      return {
        ...state,
        timeRemaining: nextTime,
      };
    }),
}));
