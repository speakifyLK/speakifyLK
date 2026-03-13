"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { completeQuizSession, submitQuizAnswer } from "@/actions/quiz";
import { aiQuizSessions, aiQuizQuestions } from "@/db/schema";

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

  const handleSubmitAnswer = () => {
    if (!currentQuestion || !userAnswer.trim()) {
      toast.error("Please provide an answer");
      return;
    }

    if (isAnswerSubmitted) return;

    startTransition(async () => {
      try {
        const result = await submitQuizAnswer(currentQuestion.id, userAnswer.trim());
        setIsCorrect(result.isCorrect);
        setIsAnswerSubmitted(true);

        if (result.isCorrect) {
          toast.success("Correct!");
        } else {
          toast.error("Incorrect. Try again!");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to submit answer");
      }
    });
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

      {/* Question */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-neutral-700">{currentQuestion.question}</h2>

        {/* MCQ Options */}
        {currentQuestion.type === "mcq" && options && (
          <div className="grid gap-3">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => !isAnswerSubmitted && setUserAnswer(option)}
                disabled={isAnswerSubmitted}
                className={`rounded-lg border-2 border-b-4 p-4 text-left transition-all ${
                  userAnswer === option
                    ? isCorrect === true
                      ? "border-green-500 bg-green-50"
                      : isCorrect === false
                        ? "border-red-500 bg-red-50"
                        : "border-sky-500 bg-sky-50"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
                } ${isAnswerSubmitted ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {/* Fill-in-the-blank or Translation input */}
        {(currentQuestion.type === "fill_blank" || currentQuestion.type === "translation") && (
          <div className="space-y-2">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => !isAnswerSubmitted && setUserAnswer(e.target.value)}
              disabled={isAnswerSubmitted}
              placeholder="Type your answer here..."
              className="w-full rounded-lg border-2 border-neutral-200 p-4 text-lg focus:border-sky-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-75"
            />
          </div>
        )}

        {/* Show explanation after answer is submitted */}
        {isAnswerSubmitted && (
          <div
            className={`rounded-lg border-2 p-4 ${
              isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
            }`}
          >
            <p className="font-semibold">{isCorrect ? "✓ Correct!" : "✗ Incorrect"}</p>
            <p className="mt-2 text-sm text-neutral-700">
              <span className="font-semibold">Correct answer:</span> {currentQuestion.correctAnswer}
            </p>
            {currentQuestion.explanation && (
              <p className="mt-2 text-sm text-neutral-600">
                <span className="font-semibold">Explanation:</span> {currentQuestion.explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        {!isAnswerSubmitted ? (
          <Button
            onClick={handleSubmitAnswer}
            disabled={pending || !userAnswer.trim()}
            size="lg"
            className="flex-1"
          >
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={pending} size="lg" className="flex-1">
            {isLastQuestion ? "Complete Quiz" : "Next Question"}
          </Button>
        )}
      </div>
    </div>
  );
};
