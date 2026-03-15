"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { completeQuizSession, submitQuizAnswer } from "@/actions/quiz";
import { aiQuizSessions, aiQuizQuestions } from "@/db/schema";
import { QuizCard } from "./quiz-card";

type Session = typeof aiQuizSessions.$inferSelect & {
  questions: (typeof aiQuizQuestions.$inferSelect)[];
};

type QuizPlayProps = {
  session: Session;
  backHref?: string;
};

export const QuizPlay = ({ session, backHref }: QuizPlayProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const currentQuestion = session.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === session.questions.length - 1;
  const isCompleted = !!session.completedAt;

  // Parse options if they exist (for MCQ questions)
  // Options are stored as an array of { text: string, isCorrect: boolean }
  const options =
    currentQuestion?.options && Array.isArray(currentQuestion.options)
      ? (currentQuestion.options as Array<{ text: string; isCorrect: boolean }>).map(
          (opt) => opt.text
        )
      : null;

  const handleAnswerSubmitted = (correct: boolean) => {
    setIsCorrect(correct);
    setIsAnswerSubmitted(true);
    
    if (correct) {
      toast.success("Correct!");
    } else {
      toast.error("Incorrect. Try again!");
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Complete the quiz
      startTransition(async () => {
        try {
          await completeQuizSession(session.id);
          toast.success("Quiz completed!");
          router.push(backHref || "/quiz");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to complete quiz");
        }
      });
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setUserAnswer("");
      setIsAnswerSubmitted(false);
      setIsCorrect(null);
    }
  };

  if (isCompleted) {
    const scorePercentage =
      session.totalQuestions > 0
        ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
        : 0;

    return (
      <div className="flex flex-col items-center justify-center gap-6 p-6">
        <h2 className="text-3xl font-bold text-neutral-700">Quiz Completed!</h2>
        <div className="text-center">
          <p className="text-xl text-neutral-600">
            Score: {session.correctAnswers} / {session.totalQuestions}
          </p>
          <p className="text-2xl font-bold text-green-600">{scorePercentage}%</p>
        </div>
        <Button onClick={() => router.push(backHref || "/quiz")} size="lg">
          Start New Quiz
        </Button>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-lg text-neutral-600">No questions available</p>
        <Button onClick={() => router.push(backHref || "/quiz")}>Back to Quiz Config</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-neutral-600">
          <span>
            Question {currentQuestionIndex + 1} of {session.questions.length}
          </span>
          <span>Topic: {session.topic}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-neutral-200">
          <div
            className="h-2 rounded-full bg-green-500 transition-all"
            style={{ width: `${((currentQuestionIndex + 1) / session.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question using QuizCard */}
      <QuizCard 
        key={currentQuestion.id}
        question={currentQuestion}
        isLastQuestion={isLastQuestion}
        onAnswerSubmittedAction={handleAnswerSubmitted}
        onNextAction={handleNext}
      />
    </div>
  );
};
