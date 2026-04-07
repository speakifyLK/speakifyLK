"use client";

import { useState, useCallback, useEffect, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { aiQuizSessions, aiQuizQuestions } from "@/db/schema";
import { submitQuizAnswer } from "@/actions/quiz";
import { shuffleArray } from "@/lib/utils";
import { QuizProgress } from "./quiz-progress";
import { QuizResult, type LocalQuestionAnswerSnapshot } from "./quiz-result";

type Session = typeof aiQuizSessions.$inferSelect & {
  questions: (typeof aiQuizQuestions.$inferSelect)[];
};

function initialLocalQuestionAnswers(questions: Session["questions"]): LocalQuestionAnswerSnapshot {
  const out: LocalQuestionAnswerSnapshot = {};
  for (const q of questions) {
    const trimmed = q.userAnswer?.trim() ?? "";
    const answeredInDb = trimmed !== "" || q.isCorrect === true || q.isCorrect === false;
    if (!answeredInDb) continue;
    out[q.id] = {
      userAnswer: trimmed !== "" ? trimmed : "No answer",
      isCorrect: q.isCorrect === true,
    };
  }
  return out;
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | undefined>(undefined);
  const [score, setScore] = useState(session.correctAnswers || 0);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [showResults, setShowResults] = useState(!!session.completedAt);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<LocalQuestionAnswerSnapshot>(() =>
    initialLocalQuestionAnswers(session.questions)
  );

  // Try Again / new ?sessionId= navigates here without remounting; reset so we don’t stay on results.
  // Depend only on session.id — after every submitQuizAnswer call Next.js does a router.refresh()
  // which passes a new session prop (new questions array reference). Including session.questions,
  // session.correctAnswers, etc. in the deps would fire this reset after every answer submission.
  useEffect(() => {
    setShowResults(!!session.completedAt);
    setCurrentQuestionIndex(0);
    setUserAnswer("");
    setIsAnswerSubmitted(false);
    setIsCorrect(null);
    setAiExplanation(undefined);
    setScore(session.correctAnswers ?? 0);
    setIsTimeUp(false);
    setAnswersByQuestionId(initialLocalQuestionAnswers(session.questions));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  const currentQuestion = session.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === session.questions.length - 1;

  // Parse options if they exist (for MCQ questions)
  // Options are stored as an array of { text: string, isCorrect: boolean }
  const options = useMemo(() => {
    if (!currentQuestion?.options || !Array.isArray(currentQuestion.options)) {
      return null;
    }
    const rawOptions = (currentQuestion.options as Array<{ text: string; isCorrect: boolean }>).map(
      (opt) => opt.text
    );
    return shuffleArray(rawOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id]);

  const handleSubmitAnswer = () => {
    /* v8 ignore next 4 -- defensive guard behind disabled button */
    if (!currentQuestion || !userAnswer.trim()) {
      toast.error("Please provide an answer");
      return;
    }
    /* v8 ignore next */
    if (isAnswerSubmitted || isSubmitting) return;

    // Stop the timer and show the Next button immediately — result arrives async
    setIsAnswerSubmitted(true);
    setIsSubmitting(true);

    startTransition(async () => {
      try {
        const result = await submitQuizAnswer(currentQuestion.id, userAnswer.trim());
        setIsCorrect(result.isCorrect);
        setAiExplanation(result.aiExplanation);
        setAnswersByQuestionId((prev) => ({
          ...prev,
          [currentQuestion.id]: {
            userAnswer: userAnswer.trim(),
            isCorrect: result.isCorrect,
          },
        }));

        // Update score if answer is correct
        if (result.isCorrect) {
          setScore((prev) => prev + 1);
          toast.success("Correct!");
        } else {
          toast.error("Incorrect answer.");
        }
      } catch (error) {
        // Roll back so the user can try again
        setIsAnswerSubmitted(false);
        toast.error(error instanceof Error ? error.message : "Failed to submit answer");
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Show result screen; completion and XP will be handled there
      setShowResults(true);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setUserAnswer("");
      setIsAnswerSubmitted(false);
      setIsCorrect(null);
      setAiExplanation(undefined);
      setIsTimeUp(false);
    }
  };

  const handleTimeUp = useCallback(() => {
    // Don't do anything if answer is already submitted or a submission is in-flight
    /* v8 ignore next -- pending and !currentQuestion branches are not exercisable in tests */
    if (isAnswerSubmitted || pending || !currentQuestion) return;

    // Lock submission immediately to avoid races with manual submit
    setIsAnswerSubmitted(true);

    // Set time up state to disable inputs
    setIsTimeUp(true);

    // Auto-submit whatever answer they have (may be empty on timeout)
    const answerToSubmit = userAnswer.trim();

    // If no answer was provided, handle timeout locally as incorrect without hitting the server
    if (!answerToSubmit) {
      setIsCorrect(false);
      setAnswersByQuestionId((prev) => ({
        ...prev,
        [currentQuestion.id]: { userAnswer: "No answer", isCorrect: false },
      }));
      toast.error("Time's up! No answer submitted.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await submitQuizAnswer(currentQuestion.id, answerToSubmit);
        setIsCorrect(result.isCorrect);
        setAnswersByQuestionId((prev) => ({
          ...prev,
          [currentQuestion.id]: {
            userAnswer: answerToSubmit,
            isCorrect: result.isCorrect,
          },
        }));

        if (result.isCorrect) {
          setScore((prev) => prev + 1);
          toast.success("Time's up! Correct answer!");
        } else {
          toast.error("Time's up! Incorrect answer.");
        }
      } catch (error) {
        // Reset time-up state so the user can try again after a failed auto-submit
        setIsTimeUp(false);
        setIsAnswerSubmitted(false);
        toast.error(error instanceof Error ? error.message : "Failed to submit answer");
      }
    });
  }, [currentQuestion, isAnswerSubmitted, pending, userAnswer]);

  if (showResults) {
    return (
      <QuizResult
        session={session}
        backHref={backHref}
        localCorrectAnswers={score}
        localQuestionAnswers={answersByQuestionId}
      />
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
      {/* Quiz Progress (timer + question progress bar + score) */}
      <QuizProgress
        difficulty={session.difficulty}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={session.totalQuestions}
        score={score}
        isAnswerSubmitted={isAnswerSubmitted}
        onTimeUp={handleTimeUp}
      />

      {/* Topic indicator */}
      <div className="flex justify-end text-sm text-neutral-600">
        <span>Topic: {session.topic}</span>
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
                onClick={() => !isAnswerSubmitted && !isTimeUp && setUserAnswer(option)}
                disabled={isAnswerSubmitted || isTimeUp}
                className={`rounded-lg border-2 border-b-4 p-4 text-left transition-all ${
                  userAnswer === option
                    ? isCorrect === true
                      ? "border-green-500 bg-green-50"
                      : isCorrect === false
                        ? "border-red-500 bg-red-50"
                        : "border-green-500 bg-green-50"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
                } ${isAnswerSubmitted || isTimeUp ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
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
              onChange={(e) => !isAnswerSubmitted && !isTimeUp && setUserAnswer(e.target.value)}
              disabled={isAnswerSubmitted || isTimeUp}
              placeholder="Type your answer here..."
              className="w-full rounded-lg border-2 border-neutral-200 p-4 text-lg focus:border-green-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-75"
            />
          </div>
        )}

        {/* Show feedback after answer is submitted or time is up */}
        {(isAnswerSubmitted || isTimeUp) && (
          <div
            className={`rounded-lg border-2 p-4 ${
              isCorrect === null
                ? "border-neutral-300 bg-neutral-50"
                : isTimeUp
                  ? "border-orange-500 bg-orange-50"
                  : isCorrect
                    ? "border-green-500 bg-green-50"
                    : "border-red-500 bg-red-50"
            }`}
          >
            <p className="font-semibold">
              {isCorrect === null
                ? "⏳ Checking..."
                : isTimeUp
                  ? "⏰ Time's up!"
                  : isCorrect
                    ? "✓ Correct!"
                    : "✗ Incorrect"}
            </p>
            {isCorrect !== null && !isCorrect && (
              <p className="mt-2 text-sm text-neutral-700">
                <span className="font-semibold">Correct answer:</span>{" "}
                {currentQuestion.correctAnswer}
              </p>
            )}
            {isCorrect !== null && (aiExplanation ?? currentQuestion.explanation) && (
              <p className="mt-2 text-sm text-neutral-600">
                <span className="font-semibold">Explanation:</span>{" "}
                {aiExplanation ?? currentQuestion.explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        {!isAnswerSubmitted && !isTimeUp ? (
          <Button
            onClick={handleSubmitAnswer}
            disabled={pending || !userAnswer.trim()}
            variant="secondary"
            size="lg"
            className="flex-1"
          >
            Submit Answer
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={pending}
            variant="primary"
            size="lg"
            className="flex-1"
          >
            {isLastQuestion ? "Complete Quiz" : "Next Question"}
          </Button>
        )}
      </div>
    </div>
  );
};
