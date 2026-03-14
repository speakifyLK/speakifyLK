"use client";

import { useEffect, useState, useRef } from "react";

type Difficulty = "beginner" | "intermediate" | "advanced";

type QuizTimerProps = {
  difficulty: Difficulty;
  score: number;
  totalQuestions: number;
  isAnswerSubmitted: boolean;
  onTimeUp?: () => void;
  resetKey?: number; // Key to reset timer when question changes
};

const TIME_LIMITS: Record<Difficulty, number> = {
  beginner: 30,
  intermediate: 20,
  advanced: 15,
};

export const QuizTimer = ({
  difficulty,
  score,
  totalQuestions,
  isAnswerSubmitted,
  onTimeUp,
  resetKey = 0,
}: QuizTimerProps) => {
  const timeLimit = TIME_LIMITS[difficulty];
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevResetKeyRef = useRef(resetKey);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  // Countdown logic with reset handling
  useEffect(() => {
    // Reset timer when question changes (resetKey changes)
    if (prevResetKeyRef.current !== resetKey) {
      prevResetKeyRef.current = resetKey;
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Reset timer state
      setTimeRemaining(timeLimit);
    }

    if (isAnswerSubmitted) {
      // Stop timer when answer is submitted
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start countdown
    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up!
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          onTimeUpRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAnswerSubmitted, resetKey, timeLimit]);

  // Calculate progress percentage (0 to 100)
  const progress = (timeRemaining / timeLimit) * 100;

  // Determine color based on time remaining
  const getColor = () => {
    const percentage = progress / 100;
    if (percentage > 0.5) return "text-green-500"; // Green: > 50% remaining
    if (percentage > 0.25) return "text-yellow-500"; // Yellow: 25-50% remaining
    return "text-red-500"; // Red: < 25% remaining
  };

  // Calculate stroke color for SVG
  const getStrokeColor = () => {
    const percentage = progress / 100;
    if (percentage > 0.5) return "#22c55e"; // green-500
    if (percentage > 0.25) return "#eab308"; // yellow-500
    return "#ef4444"; // red-500
  };

  // Calculate circumference for circular progress
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex items-center justify-center gap-8">
      {/* Circular Countdown Timer */}
      <div className="relative flex items-center justify-center">
        <svg className="-rotate-90 transform" width="120" height="120" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-neutral-200"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke={getStrokeColor()}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-linear"
          />
        </svg>
        {/* Time text in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-bold ${getColor()}`}>{timeRemaining}</span>
        </div>
      </div>

      {/* Score Indicator */}
      <div className="flex flex-col items-center gap-2">
        <div className="text-sm font-medium text-neutral-600">Score</div>
        <div className="text-4xl font-bold text-sky-600">
          {score}/{totalQuestions}
        </div>
      </div>
    </div>
  );
};
