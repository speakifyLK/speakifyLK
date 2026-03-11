"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, HelpCircle, Lightbulb } from "lucide-react";
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

type QuizCardProps = {
  question: Question;
  /** Called after the user submits (so the parent can track progress) */
  onAnswerSubmitted?: (isCorrect: boolean) => void;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** 2×2 grid of MCQ option buttons */
const McqOptions = ({
  options,
  selectedAnswer,
  isSubmitted,
  correctAnswer,
  onSelect,
}: {
  options: McqOption[];
  selectedAnswer: string;
  isSubmitted: boolean;
  correctAnswer: string;
  onSelect: (text: string) => void;
}) => (
  <div className="grid grid-cols-2 gap-3">
    {options.map((opt, idx) => {
      const isSelected = selectedAnswer === opt.text;
      const isCorrectOption = opt.text === correctAnswer;

      let variant:
        | "default"
        | "primary"
        | "secondary"
        | "danger"
        | "locked" = "default";

      if (isSubmitted) {
        if (isCorrectOption) variant = "secondary"; // green
        else if (isSelected) variant = "danger"; // red
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
            isSubmitted && isCorrectOption && "ring-2 ring-green-400"
          )}
        >
          <span className="mr-2 font-bold text-xs opacity-60">
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
  const displaySentence = sentence.replace(
    /_{2,}|\[blank\]|\[___\]/gi,
    " _______ "
  );

  return (
    <div className="space-y-4">
      {/* Sentence with blank */}
      <p className="rounded-xl bg-slate-50 border-2 border-slate-200 p-5 text-lg font-medium text-neutral-800 leading-relaxed">
        {displaySentence}
      </p>

      {/* Text input */}
      <input
        type="text"
        value={value}
        onChange={(e) => !isSubmitted && onChange(e.target.value)}
        disabled={isSubmitted}
        placeholder="Type your answer here…"
        className="w-full rounded-xl border-2 border-slate-200 border-b-4 p-4 text-lg focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
      />

      {/* Hint button */}
      {hint && (
        <div>
          <button
            type="button"
            onClick={() => setShowHint((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
          >
            <Lightbulb className="h-4 w-4" />
            {showHint ? "Hide hint" : "Show hint"}
          </button>

          {showHint && (
            <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
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
      <div className="rounded-xl bg-indigo-50 border-2 border-indigo-200 p-5">
        <span className="mb-2 inline-block rounded-full bg-indigo-200 px-3 py-0.5 text-xs font-bold uppercase text-indigo-700 tracking-wider">
          {sourceLanguage}
        </span>
        <p className="text-lg font-medium text-neutral-800 leading-relaxed mt-2">
          {sourceText}
        </p>
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
          rows={3}
          className="w-full rounded-xl border-2 border-slate-200 border-b-4 p-4 text-lg focus:border-sky-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 resize-none transition-colors"
        />
        <span
          className={cn(
            "absolute bottom-4 right-4 text-xs font-medium",
            value.length > MAX_CHARS * 0.9
              ? "text-rose-500"
              : "text-slate-400"
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
}: {
  explanation: string;
  isCorrect: boolean;
  correctAnswer: string;
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="space-y-3">
      {/* Correct/Incorrect badge */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border-2 p-4 font-semibold",
          isCorrect
            ? "border-green-300 bg-green-50 text-green-700"
            : "border-rose-300 bg-rose-50 text-rose-700"
        )}
      >
        <span className="text-lg">{isCorrect ? "✓" : "✗"}</span>
        <span>{isCorrect ? "Correct!" : "Incorrect"}</span>
        {!isCorrect && (
          <span className="ml-auto text-sm font-normal text-neutral-600">
            Answer: <strong className="text-neutral-800">{correctAnswer}</strong>
          </span>
        )}
      </div>

      {/* Collapsible explanation */}
      {explanation && (
        <div className="rounded-xl border-2 border-sky-200 bg-sky-50 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4" />
              Explanation
            </span>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {isOpen && (
            <div className="border-t border-sky-200 px-4 py-3 text-sm text-sky-900 leading-relaxed">
              {explanation}
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

export const QuizCard = ({ question, onAnswerSubmitted }: QuizCardProps) => {
  const [userAnswer, setUserAnswer] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [pending, startTransition] = useTransition();

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
      ? String(
          (question.options as { sourceLanguage?: string }).sourceLanguage ?? ""
        )
      : "Sinhala";

  const handleSubmit = () => {
    if (!userAnswer.trim()) {
      toast.error("Please provide an answer.");
      return;
    }
    if (isSubmitted) return;

    startTransition(async () => {
      try {
        const result = await submitQuizAnswer(question.id, userAnswer.trim());
        setIsCorrect(result.isCorrect);
        setIsSubmitted(true);
        onAnswerSubmitted?.(result.isCorrect);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to submit answer."
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Question text ── */}
      <h2 className="text-2xl font-bold text-neutral-800">
        {question.question}
      </h2>

      {/* ── Type-specific input ── */}
      {question.type === "mcq" && mcqOptions && (
        <McqOptions
          options={mcqOptions}
          selectedAnswer={userAnswer}
          isSubmitted={isSubmitted}
          correctAnswer={question.correctAnswer}
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
        />
      )}

      {/* ── Submit button ── */}
      {!isSubmitted && (
        <Button
          onClick={handleSubmit}
          disabled={pending || !userAnswer.trim()}
          variant="secondary"
          size="lg"
          className="w-full"
        >
          {pending ? "Submitting…" : "Submit Answer"}
        </Button>
      )}
    </div>
  );
};
