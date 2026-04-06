"use client";

import { useState, useTransition } from "react";
import { Info, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitQuizAnswer } from "@/actions/quiz";
import type { aiQuizQuestions } from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Question = typeof aiQuizQuestions.$inferSelect;

type McqOption = { text: string; isCorrect: boolean };

/** Map stored lowercase language keys to human-friendly labels. */
const LANGUAGE_LABELS: Record<string, string> = {
  sinhala: "Sinhala",
  english: "English",
  tamil: "Tamil",
};

type QuizCardProps = {
  question: Question;
  isLastQuestion?: boolean;
  /** Called after the user submits (so the parent can track progress) */
  onAnswerSubmittedAction?: (isCorrect: boolean) => void;
  onNextAction: () => void | Promise<void>;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** 2×2 grid of MCQ option buttons */
const McqOptions = ({
  options,
  selectedAnswer,
  isSubmitted,
  onSelect,
}: {
  options: McqOption[];
  selectedAnswer: string;
  isSubmitted: boolean;
  onSelect: (text: string) => void;
}) => (
  <div className="grid grid-cols-2 gap-3">
    {options.map((opt, idx) => {
      const isSelected = selectedAnswer === opt.text;

      let variant: "default" | "primary" | "secondary" | "danger" | "locked" = "default";

      if (isSubmitted) {
        if (opt.isCorrect)
          variant = "secondary"; // green
        else if (isSelected)
          variant = "danger"; // red
        else variant = "locked"; // greyed out
      } else if (isSelected) {
        variant = "primary"; // blue highlight
      }

      return (
        <Button
          key={idx}
          variant={variant}
          size="lg"
          disabled={isSubmitted}
          onClick={() => onSelect(opt.text)}
          className={cn(
            "h-auto min-h-[56px] whitespace-normal text-left normal-case tracking-normal",
            isSubmitted && opt.isCorrect && "ring-2 ring-green-400"
          )}
        >
          <span className="mr-2 text-xs font-bold opacity-60">
            {String.fromCharCode(65 + idx)}.
          </span>
          {opt.text}
        </Button>
      );
    })}
  </div>
);

/** Fill-in-the-blank: sentence with blank + input + hint */
const FillInBlankInput = ({
  sentence,
  value,
  hint,
  isSubmitted,
  onChange,
}: {
  sentence: string;
  value: string;
  hint: string;
  isSubmitted: boolean;
  onChange: (v: string) => void;
}) => {
  const [showHint, setShowHint] = useState(false);

  // Replace underscores / blank placeholder with a visible gap
  const displaySentence = sentence.replace(/_{2,}|\[blank\]|\[___\]/gi, " _______ ");

  return (
    <div className="space-y-4">
      {/* Sentence with blank */}
      <p className="rounded-xl border-2 border-slate-200 bg-slate-50 p-5 text-lg font-medium leading-relaxed text-neutral-800">
        {displaySentence}
      </p>

      {/* Text input */}
      <input
        type="text"
        value={value}
        onChange={(e) => !isSubmitted && onChange(e.target.value)}
        disabled={isSubmitted}
        placeholder="Type your answer here…"
        className="w-full rounded-xl border-2 border-b-4 border-slate-200 p-4 text-lg transition-colors focus:border-green-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />

      {/* Hint button */}
      {hint && (
        <div>
          <button
            type="button"
            onClick={() => setShowHint((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 transition-colors hover:text-green-700"
          >
            <Lightbulb className="h-4 w-4" />
            {showHint ? "Hide hint" : "Show hint"}
          </button>

          {showHint && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              💡 {hint}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Translation: source text + textarea + character count */
const TranslationInput = ({
  sourceText,
  sourceLanguage,
  value,
  isSubmitted,
  onChange,
}: {
  sourceText: string;
  sourceLanguage: string;
  value: string;
  isSubmitted: boolean;
  onChange: (v: string) => void;
}) => {
  const MAX_CHARS = 500;

  return (
    <div className="space-y-4">
      {/* Source text with language label */}
      <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-5">
        <span className="mb-2 inline-block rounded-full bg-indigo-200 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
          {LANGUAGE_LABELS[sourceLanguage.toLowerCase()] ?? sourceLanguage}
        </span>
        <p className="mt-2 text-lg font-medium leading-relaxed text-neutral-800">{sourceText}</p>
      </div>

      {/* Translation textarea */}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => {
            if (!isSubmitted && e.target.value.length <= MAX_CHARS) {
              onChange(e.target.value);
            }
          }}
          disabled={isSubmitted}
          placeholder="Type your translation here…"
          aria-label="Type your translation"
          rows={3}
          className="w-full resize-none rounded-xl border-2 border-b-4 border-slate-200 p-4 text-lg transition-colors focus:border-green-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span
          className={cn(
            "absolute bottom-4 right-4 text-xs font-medium",
            value.length > MAX_CHARS * 0.9 ? "text-rose-500" : "text-slate-400"
          )}
        >
          {value.length}/{MAX_CHARS}
        </span>
      </div>
    </div>
  );
};

/** Collapsible blue info panel for explanations */
const ExplanationPanel = ({
  explanation,
  isCorrect,
  correctAnswer,
  userAnswer,
  onGotIt,
}: {
  explanation: string;
  isCorrect: boolean;
  correctAnswer: string;
  userAnswer: string;
  onGotIt: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(true);

  if (isCorrect) {
    return (
      <div className="flex items-center gap-2 rounded-xl border-2 border-green-300 bg-green-50 p-4 font-semibold text-green-700">
        <span className="text-lg">✓</span>
        <span>Correct!</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Collapsible explanation */}
      {explanation && (
        <div className="overflow-hidden rounded-xl border-2 border-sky-300 bg-sky-50">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-sky-800 transition-colors hover:bg-sky-100"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-controls="ai-explanation-panel"
          >
            <span className="flex items-center gap-1.5">
              <Info className="h-5 w-5" />
              <span className="text-base">AI Explanation</span>
            </span>
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>

          {isOpen && (
            <div
              id="ai-explanation-panel"
              className="space-y-4 border-t border-sky-200 px-4 py-4 text-sm leading-relaxed text-sky-900"
            >
              <div className="mb-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-neutral-700">Correct Answer:</span>
                  <span className="rounded bg-green-100 px-2 py-1 font-medium text-green-700">
                    {correctAnswer}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-neutral-700">Your Answer:</span>
                  <span className="text-rose-600 line-through">{userAnswer}</span>
                </div>
              </div>

              <div className="border-t border-sky-200 pt-2">
                <p className="text-base">{explanation}</p>
              </div>

              <div className="pt-2 text-right">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    onGotIt();
                  }}
                  className="bg-sky-500 font-semibold text-white hover:bg-sky-600"
                >
                  Got it
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const QuizCard = ({
  question,
  isLastQuestion,
  onAnswerSubmittedAction,
  onNextAction,
}: QuizCardProps) => {
  const [userAnswer, setUserAnswer] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [explanationAcknowledged, setExplanationAcknowledged] = useState(false);
  const [pending, startTransition] = useTransition();
  const [isNextPending, setIsNextPending] = useState(false);

  // Reset local state whenever the question changes using useEffect
  // The parent should pass `key={question.id}` instead.
  // We no longer manually clear state here to avoid react-hooks/set-state-in-effect issues.

  // Parse MCQ options
  const mcqOptions: McqOption[] | null =
    question.type === "mcq" && Array.isArray(question.options)
      ? (question.options as McqOption[])
      : null;

  // Parse hint for fill-in-blank
  const hint: string =
    question.type === "fill_blank" &&
    question.options &&
    typeof question.options === "object" &&
    "hint" in question.options
      ? String((question.options as { hint?: string }).hint ?? "")
      : "";

  // Parse translation metadata
  const sourceLanguage: string =
    question.type === "translation" &&
    question.options &&
    typeof question.options === "object" &&
    "sourceLanguage" in question.options
      ? String((question.options as { sourceLanguage?: string }).sourceLanguage ?? "")
      : "Sinhala";

  const handleSubmit = () => {
    /* v8 ignore next 4 -- defensive guard behind disabled button */
    if (!userAnswer.trim()) {
      toast.error("Please provide an answer.");
      return;
    }
    /* v8 ignore next */
    if (isSubmitted) return;

    startTransition(async () => {
      try {
        const result = await submitQuizAnswer(question.id, userAnswer.trim());
        setIsCorrect(result.isCorrect);
        setIsSubmitted(true);
        if (result.isCorrect) {
          setExplanationAcknowledged(true);
        }
        onAnswerSubmittedAction?.(result.isCorrect);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to submit answer.");
      }
    });
  };

  const handleNextClick = async () => {
    // Guard against concurrent clicks and respect existing gating condition.
    /* v8 ignore next 3 -- !isCorrect && !explanationAcknowledged branch is behind disabled button */
    if (isNextPending || (!isCorrect && !explanationAcknowledged)) {
      return;
    }
    setIsNextPending(true);
    try {
      await Promise.resolve(onNextAction());
    } finally {
      setIsNextPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Question text ── */}
      {question.type !== "fill_blank" && question.type !== "translation" && (
        <h2 className="text-2xl font-bold text-neutral-800">{question.question}</h2>
      )}

      {/* ── Type-specific input ── */}
      {question.type === "mcq" && mcqOptions && (
        <McqOptions
          options={mcqOptions}
          selectedAnswer={userAnswer}
          isSubmitted={isSubmitted}
          onSelect={setUserAnswer}
        />
      )}

      {question.type === "fill_blank" && (
        <FillInBlankInput
          sentence={question.question}
          value={userAnswer}
          hint={hint}
          isSubmitted={isSubmitted}
          onChange={setUserAnswer}
        />
      )}

      {question.type === "translation" && (
        <TranslationInput
          sourceText={question.question}
          sourceLanguage={sourceLanguage}
          value={userAnswer}
          isSubmitted={isSubmitted}
          onChange={setUserAnswer}
        />
      )}

      {/* ── Explanation panel (shown after submit) ── */}
      {isSubmitted && (
        <ExplanationPanel
          explanation={question.explanation ?? ""}
          isCorrect={isCorrect}
          correctAnswer={question.correctAnswer}
          userAnswer={userAnswer}
          onGotIt={() => setExplanationAcknowledged(true)}
        />
      )}

      {/* ── Action buttons ── */}
      {!isSubmitted ? (
        <Button
          onClick={handleSubmit}
          disabled={pending || !userAnswer.trim()}
          variant="secondary"
          size="lg"
          className="h-14 w-full text-lg font-bold"
        >
          {pending ? "Submitting…" : "Submit Answer"}
        </Button>
      ) : (
        <Button
          onClick={handleNextClick}
          disabled={(!isCorrect && !explanationAcknowledged) || isNextPending}
          variant={!isCorrect && !explanationAcknowledged ? "locked" : "primary"}
          size="lg"
          className="h-14 w-full text-lg font-bold"
        >
          {isLastQuestion ? "Complete Quiz" : "Next Question"}
        </Button>
      )}
    </div>
  );
};
