"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

import { Button } from "@/components/ui/button";
import { completeQuizSession } from "@/actions/quiz";
import type { aiQuizQuestions, aiQuizSessions } from "@/db/schema";

type SessionWithQuestions = typeof aiQuizSessions.$inferSelect & {
  questions: (typeof aiQuizQuestions.$inferSelect)[];
};

export type LocalQuestionAnswerSnapshot = Record<
  number,
  { userAnswer: string; isCorrect: boolean }
>;

type QuizResultProps = {
  session: SessionWithQuestions;
  backHref?: string;
  /** Optional override for correct answers when coming from in-progress client state */
  localCorrectAnswers?: number;
  /** Per-question answers from QuizPlay; session.questions may be stale until refresh */
  localQuestionAnswers?: LocalQuestionAnswerSnapshot;
};

const getLetterGrade = (percentage: number): string => {
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "F";
};

const getBadgeColor = (percentage: number) => {
  if (percentage >= 80) return "bg-emerald-100 text-emerald-700 border-emerald-300";
  if (percentage >= 50) return "bg-amber-100 text-amber-700 border-amber-300";
  return "bg-rose-100 text-rose-700 border-rose-300";
};

const MIN_API_QUESTIONS = 5;
const MAX_API_QUESTIONS = 15;

function clampQuestionCountForApi(n: number): number {
  const v = Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
  return Math.min(MAX_API_QUESTIONS, Math.max(MIN_API_QUESTIONS, v));
}

/** Same order as `QuizConfig` checkboxes so per-type question counts match the original setup. */
const QUIZ_CONFIG_TYPE_ORDER = ["mcq", "fill_blank", "translation"] as const;

function questionTypesForRetry(
  questions: SessionWithQuestions["questions"]
): ("mcq" | "fill_blank" | "translation")[] {
  const used = new Set(questions.map((q) => q.type));
  const ordered = QUIZ_CONFIG_TYPE_ORDER.filter((t) => used.has(t));
  if (ordered.length > 0) return [...ordered];
  return ["mcq", "fill_blank", "translation"];
}

function parseSessionIdFromGenerateResponse(data: unknown): number | undefined {
  if (!data || typeof data !== "object" || !("sessionId" in data)) return undefined;
  const raw = (data as { sessionId: unknown }).sessionId;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) return Number.parseInt(raw.trim(), 10);
  return undefined;
}

export const QuizResult = ({
  session,
  backHref,
  localCorrectAnswers,
  localQuestionAnswers,
}: QuizResultProps) => {
  const router = useRouter();
  const { width, height } = useWindowSize();
  const [hasCompleted, setHasCompleted] = useState(!!session.completedAt);
  const [isCompleting, setIsCompleting] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [tryAgainLoading, setTryAgainLoading] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalQuestions = session.totalQuestions || session.questions.length || 0;
  const correctAnswers = localCorrectAnswers ?? session.correctAnswers ?? 0;

  const scorePercentage = useMemo(
    () => (totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0),
    [correctAnswers, totalQuestions]
  );

  const letterGrade = useMemo(() => getLetterGrade(scorePercentage), [scorePercentage]);

  // Calculate simple duration if timestamps exist
  const timeTakenLabel = useMemo(() => {
    if (!session.startedAt || !session.completedAt) return "—";
    const startedAt =
      typeof session.startedAt === "string" ? new Date(session.startedAt) : session.startedAt;
    const completedAt =
      typeof session.completedAt === "string" ? new Date(session.completedAt) : session.completedAt;
    if (
      !(startedAt instanceof Date) ||
      Number.isNaN(startedAt.getTime()) ||
      !(completedAt instanceof Date) ||
      Number.isNaN(completedAt.getTime())
    ) {
      return "—";
    }
    const ms = completedAt.getTime() - startedAt.getTime();
    if (ms <= 0) return "—";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }, [session.startedAt, session.completedAt]);

  // Finalise quiz session and award XP when result screen mounts
  useEffect(() => {
    if (hasCompleted || !session.id) return;

    let isMounted = true;

    const run = async () => {
      try {
        setIsCompleting(true);
        const { xpAwarded } = await completeQuizSession(session.id);
        if (!isMounted) return;
        setHasCompleted(true);
        if (xpAwarded > 0) {
          toast.success(`+${xpAwarded} XP from AI Quiz!`, {
            icon: <Sparkles className="size-5 text-amber-500" aria-hidden />,
          });
        }
        router.refresh();
      } catch (error) {
        if (!isMounted) return;
        // If session is already completed, ignore; otherwise show a toast
        const message = error instanceof Error ? error.message : "Failed to finalise quiz session.";
        if (!message.toLowerCase().includes("already completed")) {
          toast.error(message);
        }
      } finally {
        if (isMounted) {
          setIsCompleting(false);
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [hasCompleted, session.id, router]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, []);

  const handleTryAgain = async () => {
    const base = backHref || "/quiz";
    setTryAgainLoading(true);
    try {
      const questionCount = clampQuestionCountForApi(
        session.totalQuestions || session.questions.length
      );
      const questionTypes = questionTypesForRetry(session.questions);

      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: session.topic,
          difficulty: session.difficulty,
          questionCount,
          questionTypes,
        }),
      });

      if (!response.ok) {
        const errBody: unknown = await response.json().catch(() => ({}));
        const msg =
          errBody &&
          typeof errBody === "object" &&
          "error" in errBody &&
          typeof (errBody as { error: unknown }).error === "string"
            ? (errBody as { error: string }).error
            : "Failed to generate quiz";
        throw new Error(msg);
      }

      const data: unknown = await response.json();
      const sessionId = parseSessionIdFromGenerateResponse(data);
      if (sessionId === undefined) {
        throw new Error("Failed to start quiz: missing session ID");
      }

      toast.success("New quiz ready!");
      const url = `${base}?sessionId=${encodeURIComponent(String(sessionId))}`;
      router.push(url);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start quiz");
    } finally {
      setTryAgainLoading(false);
    }
  };

  const handleNewQuiz = () => {
    router.push(backHref || "/quiz");
  };

  const handleShareResults = async () => {
    try {
      const shareText = `I scored ${scorePercentage}% (${letterGrade}) on the "${session.topic}" ${session.difficulty} quiz in Speakify!`;
      await navigator.clipboard.writeText(shareText);
      setHasCopied(true);
      toast.success("Results copied to clipboard!");
      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setHasCopied(false);
      }, 2000);
    } catch {
      toast.error("Unable to copy to clipboard.");
    }
  };

  const showConfetti = scorePercentage >= 80;

  return (
    <div className="relative flex flex-col gap-8 p-6">
      {showConfetti && width > 0 && height > 0 && (
        <Confetti
          numberOfPieces={250}
          recycle={false}
          width={width}
          height={height}
          className="pointer-events-none fixed inset-0 z-50"
        />
      )}

      <div className="flex flex-col items-center gap-4">
        <h2 className="text-3xl font-bold text-neutral-800">Quiz Completed 🎉</h2>
        <p className="text-sm text-neutral-500">
          Topic: <span className="font-semibold text-neutral-700">{session.topic}</span> ·{" "}
          <span className="capitalize">{session.difficulty}</span>
        </p>
      </div>

      {/* Score circle and grade */}
      <div className="mx-auto flex flex-col items-center gap-4">
        <div className="h-40 w-40">
          <CircularProgressbar
            value={scorePercentage}
            text={`${scorePercentage}%`}
            styles={buildStyles({
              pathColor:
                scorePercentage >= 80 ? "#22c55e" : scorePercentage >= 50 ? "#eab308" : "#ef4444",
              trailColor: "#e5e7eb",
              textColor: "#111827",
              textSize: "18px",
            })}
          />
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-4 py-1 text-sm font-semibold ${getBadgeColor(
            scorePercentage
          )}`}
        >
          Grade {letterGrade}
        </span>
        <p className="text-sm text-neutral-500">
          {correctAnswers} / {totalQuestions} correct answers
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-3 rounded-xl border-2 border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-4">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-neutral-500">Questions</span>
          <span className="text-lg font-semibold text-neutral-800">{totalQuestions || "—"}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-neutral-500">Correct</span>
          <span className="text-lg font-semibold text-emerald-600">{correctAnswers}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-neutral-500">Time taken</span>
          <span className="text-lg font-semibold text-neutral-800">{timeTakenLabel}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-neutral-500">Difficulty</span>
          <span className="text-lg font-semibold capitalize text-neutral-800">
            {session.difficulty}
          </span>
        </div>
      </div>

      {/* Question review */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-neutral-800">Question review</h3>
        <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
          {session.questions.length === 0 ? (
            <p className="text-sm text-neutral-500">No questions found for this session.</p>
          ) : (
            session.questions.map((q, index) => {
              const local = localQuestionAnswers?.[q.id];
              const isCorrect = local ? local.isCorrect : q.isCorrect === true;
              const userAnswer = local?.userAnswer ?? q.userAnswer ?? "No answer";
              return (
                <div
                  key={q.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="font-semibold text-neutral-800">
                      {index + 1}. {q.question}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                  <p className={`mt-1 text-xs ${isCorrect ? "text-emerald-700" : "text-rose-700"}`}>
                    Your answer: <span className="font-semibold">{userAnswer}</span>
                  </p>
                  <p className="mt-1 text-xs text-neutral-700">
                    Correct answer: <span className="font-semibold">{q.correctAnswer}</span>
                  </p>
                  {q.explanation && (
                    <p className="mt-1 text-xs text-neutral-500">Explanation: {q.explanation}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button
          variant="default"
          size="lg"
          className="flex-1"
          onClick={() => void handleTryAgain()}
          disabled={isCompleting || tryAgainLoading}
        >
          {tryAgainLoading ? "Starting…" : "Try Again"}
        </Button>
        <Button variant="secondary" size="lg" className="flex-1" onClick={handleNewQuiz}>
          New Quiz
        </Button>
        <Button
          variant="secondaryOutline"
          size="lg"
          className="flex-1"
          onClick={handleShareResults}
        >
          {hasCopied ? "Copied!" : "Share Results"}
        </Button>
      </div>
    </div>
  );
};
