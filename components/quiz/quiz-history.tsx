"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { aiQuizQuestions, aiQuizSessions } from "@/db/schema";
import { cn } from "@/lib/utils";

type QuizHistoryItem = Pick<
  typeof aiQuizSessions.$inferSelect,
  "id" | "topic" | "difficulty" | "score" | "totalQuestions" | "correctAnswers" | "startedAt"
>;

type QuizStats = {
  totalQuizzes: number;
  averageScore: number;
  favouriteTopic: string | null;
  improvementTrend: "improving" | "declining" | "stable";
  quizStreak: number;
};

type SessionWithQuestions = typeof aiQuizSessions.$inferSelect & {
  questions: (typeof aiQuizQuestions.$inferSelect)[];
};

type QuizHistoryProps = {
  history: QuizHistoryItem[];
  stats: QuizStats;
};

const getScoreBadgeClasses = (score: number | null | undefined) => {
  const value = typeof score === "number" ? score : 0;
  if (value >= 80) return "bg-emerald-100 text-emerald-700 border-emerald-300";
  if (value >= 50) return "bg-amber-100 text-amber-700 border-amber-300";
  return "bg-rose-100 text-rose-700 border-rose-300";
};

const trendLabel: Record<QuizStats["improvementTrend"], string> = {
  improving: "Improving",
  declining: "Declining",
  stable: "Stable",
};

export const QuizHistory = ({ history, stats }: QuizHistoryProps) => {
  const [selectedSession, setSelectedSession] = useState<SessionWithQuestions | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOpenSession = (sessionId: number) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/quiz/session?sessionId=${sessionId}`);
        if (!res.ok) return;
        const session = (await res.json()) as SessionWithQuestions;
        setSelectedSession(session);
        setOpen(true);
      } catch {
        // Silent fail; could add toast if desired
      }
    });
  };

  return (
    <div className="mt-8 space-y-4">
      <h2 className="text-2xl font-bold text-neutral-800">Your quiz performance</h2>

      {/* Stats summary card */}
      <div className="grid gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Total quizzes</p>
          <p className="text-2xl font-semibold text-neutral-900">{stats.totalQuizzes}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Average score</p>
          <p className="text-2xl font-semibold text-neutral-900">
            {Math.round(stats.averageScore)}%
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Favourite topic</p>
          <p className="truncate text-sm font-semibold text-neutral-900">
            {stats.favouriteTopic ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Streak</p>
          <p className="text-2xl font-semibold text-neutral-900">
            {stats.quizStreak}{" "}
            <span className="text-sm font-normal text-neutral-600">
              {stats.quizStreak === 1 ? "day" : "days"}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Trend</p>
          <p className="text-sm font-semibold text-neutral-900">
            {trendLabel[stats.improvementTrend]}
          </p>
        </div>
      </div>

      {/* History list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-800">Recent quizzes</h3>
          <span className="text-xs text-neutral-500">
            Showing last {history.length || 0} sessions
          </span>
        </div>

        <ScrollArea className="max-h-80 rounded-2xl border border-slate-200 bg-white p-2">
          {history.length === 0 ? (
            <p className="p-2 text-sm text-neutral-500">
              You haven&apos;t taken any AI quizzes yet. Start one to see your progress here.
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpenSession(item.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:bg-slate-100"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-900">{item.topic}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      <span className="capitalize">{item.difficulty}</span> ·{" "}
                      {item.startedAt ? format(new Date(item.startedAt), "MMM d, yyyy") : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex min-w-[64px] items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                        getScoreBadgeClasses(
                          typeof item.score === "number"
                            ? item.score
                            : item.totalQuestions > 0
                              ? Math.round((item.correctAnswers / item.totalQuestions) * 100)
                              : 0
                        )
                      )}
                    >
                      {typeof item.score === "number"
                        ? `${Math.round(item.score)}%`
                        : item.totalQuestions > 0
                          ? `${Math.round((item.correctAnswers / item.totalQuestions) * 100)}%`
                          : "0%"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Session review dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {selectedSession ? `Review: ${selectedSession.topic}` : "Quiz review"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
                Review how you answered each question compared to the correct answer.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-3 text-xs">
            <div className="flex flex-col">
              <span className="uppercase tracking-wide text-neutral-500">Score</span>
              <span className="text-sm font-semibold text-neutral-900">
                {selectedSession
                  ? `${selectedSession.correctAnswers} / ${selectedSession.totalQuestions}`
                  : "—"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="uppercase tracking-wide text-neutral-500">Difficulty</span>
              <span className="text-sm font-semibold capitalize text-neutral-900">
                {selectedSession?.difficulty ?? "—"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="uppercase tracking-wide text-neutral-500">Date</span>
              <span className="text-sm font-semibold text-neutral-900">
                {selectedSession?.startedAt
                  ? format(new Date(selectedSession.startedAt), "MMM d, yyyy")
                  : "—"}
              </span>
            </div>
          </div>

          <ScrollArea className="mt-3 max-h-[50vh] rounded-xl border border-slate-200 bg-slate-50 p-3">
            {isPending && !selectedSession ? (
              <p className="text-sm text-neutral-500">Loading session...</p>
            ) : !selectedSession ? (
              <p className="text-sm text-neutral-500">
                Select a quiz from the list to see its questions.
              </p>
            ) : selectedSession.questions.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No questions were recorded for this session.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                {selectedSession.questions.map((q, index) => {
                  const isCorrect = q.isCorrect === true;
                  const userAnswer = q.userAnswer ?? "No answer";
                  return (
                    <div key={q.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <p className="font-semibold text-neutral-900">
                          {index + 1}. {q.question}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                            isCorrect
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          )}
                        >
                          {isCorrect ? "Correct" : "Incorrect"}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          isCorrect ? "text-emerald-700" : "text-rose-700"
                        )}
                      >
                        Your answer: <span className="font-semibold">{userAnswer}</span>
                      </p>
                      <p className="mt-1 text-xs text-neutral-700">
                        Correct answer: <span className="font-semibold">{q.correctAnswer}</span>
                      </p>
                      {q.explanation && (
                        <p className="mt-1 text-xs text-neutral-500">
                          Explanation: {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
