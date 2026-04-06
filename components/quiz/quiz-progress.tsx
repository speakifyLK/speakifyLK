"use client";

import { useEffect, useRef } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

import { Progress } from "@/components/ui/progress";
import { useQuizStore } from "@/store/quiz-store";

type Difficulty = "beginner" | "intermediate" | "advanced";

const TIME_LIMITS: Record<Difficulty, number> = {
  beginner: 30,
  intermediate: 20,
  advanced: 15,
};

type QuizProgressProps = {
  difficulty: Difficulty;
  currentQuestionIndex: number;
  totalQuestions: number;
  score: number;
  isAnswerSubmitted: boolean;
  onTimeUp?: () => void;
};

export const QuizProgress = ({
  difficulty,
  currentQuestionIndex,
  totalQuestions,
  score,
  isAnswerSubmitted,
  onTimeUp,
}: QuizProgressProps) => {
  const timeLimit = TIME_LIMITS[difficulty];
  const { timeRemaining, decrementTimer, resetTimer } = useQuizStore();
  const onTimeUpRef = useRef(onTimeUp);
  // Tracks whether the timer has counted down from a positive value at least once,
  // to avoid firing onTimeUp on the initial render before resetTimer takes effect.
  const timerHasRunRef = useRef(false);

  // Keep onTimeUp callback reference fresh without restarting effects
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // Reset the store timer each time the question changes
  useEffect(() => {
    timerHasRunRef.current = false;
    resetTimer(timeLimit);
  }, [currentQuestionIndex, timeLimit, resetTimer]);

  // Record when the timer has been running (timeRemaining > 0) so we can
  // distinguish a real expiry from the store's initial zero state
  useEffect(() => {
    if (timeRemaining > 0) {
      timerHasRunRef.current = true;
    }
  }, [timeRemaining]);

  // Decrement the store timer every second while the question is unanswered
  // and there is still time remaining
  useEffect(() => {
    if (isAnswerSubmitted || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      decrementTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [isAnswerSubmitted, timeRemaining, decrementTimer]);

  // Fire onTimeUp once the timer genuinely reaches 0
  useEffect(() => {
    if (timeRemaining === 0 && timerHasRunRef.current && !isAnswerSubmitted) {
      onTimeUpRef.current?.();
    }
  }, [timeRemaining, isAnswerSubmitted]);

  const percentage = timeLimit > 0 ? (timeRemaining / timeLimit) * 100 : 0;
  const questionProgress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const getTimerColor = () => {
    if (percentage > 50) return "#22c55e"; // green-500
    if (percentage > 25) return "#eab308"; // yellow-500
    return "#ef4444"; // red-500
  };

  const color = getTimerColor();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-12">
        {/* Circular countdown timer */}
        <div className="h-28 w-28">
          <CircularProgressbar
            value={percentage}
            text={`${timeRemaining}s`}
            styles={buildStyles({
              textSize: "22px",
              pathColor: color,
              textColor: color,
              trailColor: "#e5e7eb",
              pathTransitionDuration: 0.8,
            })}
          />
        </div>

        {/* Score indicator */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium text-neutral-600">Score</span>
          <span className="text-4xl font-bold text-sky-600">
            {score}/{totalQuestions}
          </span>
        </div>
      </div>

      {/* Horizontal question progress bar */}
      <div className="space-y-1">
        <span className="text-sm text-neutral-600">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </span>
        <Progress value={questionProgress} className="h-2" />
      </div>
    </div>
  );
};
