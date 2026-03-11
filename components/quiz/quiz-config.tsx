"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { units as unitsTable } from "@/db/schema";
import type { Difficulty } from "@/lib/quiz-prompt";

type Unit = Pick<
  typeof unitsTable.$inferSelect,
  "id" | "title" | "description" | "order" | "courseId"
> & {
  lessons: Array<{ id: number; completed: boolean }>;
};

type QuizConfigProps = {
  units: Unit[];
};

type QuestionType = "mcq" | "fill_blank" | "translation";

export const QuizConfig = ({ units }: QuizConfigProps) => {
  const router = useRouter();
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([
    "mcq",
    "fill_blank",
    "translation",
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleQuestionType = (type: QuestionType) => {
    setQuestionTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Keyboard navigation for single-select button groups
  const handleButtonGroupKeyDown = <T,>(
    e: React.KeyboardEvent,
    options: Array<{ value: T }>,
    currentValue: T,
    setValue: (value: T) => void
  ) => {
    const currentIndex = options.findIndex((opt) => opt.value === currentValue);
    let nextIndex = currentIndex;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % options.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = options.length - 1;
    }

    if (nextIndex !== currentIndex && nextIndex >= 0) {
      setValue(options[nextIndex].value);
    }
  };

  const handleStartQuiz = async () => {
    if (!selectedTopic) {
      toast.error("Please select a topic");
      return;
    }

    if (questionTypes.length === 0) {
      toast.error("Please select at least one question type");
      return;
    }

    const selectedUnit = units.find((u) => u.id === selectedTopic);
    if (!selectedUnit) {
      toast.error("Selected topic not found");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: selectedUnit.title,
          difficulty,
          questionCount,
          questionTypes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate quiz");
      }

      const data = await response.json();
      const sessionId = data?.sessionId;
      if (!sessionId) {
        throw new Error("Failed to start quiz: missing session ID");
      }
      toast.success("Quiz generated successfully!");
      router.push(`/quiz?sessionId=${encodeURIComponent(sessionId)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start quiz");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Topic Selector Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-neutral-700">Select Topic</h2>
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          role="group"
          aria-label="Select topic"
        >
          {units.map((unit, index) => (
            <button
              key={unit.id}
              onClick={() => setSelectedTopic(unit.id)}
              aria-pressed={selectedTopic === unit.id}
              onKeyDown={(e) => {
                if (selectedTopic === null && units.length > 0) {
                  // If nothing is selected, start with first item
                  if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "Home") {
                    e.preventDefault();
                    setSelectedTopic(units[0].id);
                  } else if (e.key === "End") {
                    e.preventDefault();
                    setSelectedTopic(units[units.length - 1].id);
                  }
                } else if (selectedTopic !== null) {
                  handleButtonGroupKeyDown(
                    e,
                    units.map((u) => ({ value: u.id })),
                    selectedTopic,
                    setSelectedTopic
                  );
                }
              }}
              tabIndex={selectedTopic === unit.id || (selectedTopic === null && index === 0) ? 0 : -1}
              className={`flex flex-col items-start justify-between rounded-xl border-2 border-b-4 p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                selectedTopic === unit.id
                  ? "border-green-500 bg-green-50"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              } active:border-b-2`}
            >
              <div className="w-full">
                <h3 className="text-lg font-bold text-neutral-700">{unit.title}</h3>
                <p className="mt-1 text-sm text-neutral-500">{unit.description}</p>
              </div>
              <div className="mt-4 text-sm font-semibold text-neutral-600">
                {unit.lessons.length} lesson{unit.lessons.length !== 1 ? "s" : ""} available
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty Picker */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-neutral-700">Difficulty Level</h2>
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
          role="group"
          aria-label="Select difficulty level"
        >
          {(["beginner", "intermediate", "advanced"] as Difficulty[]).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              aria-pressed={difficulty === level}
              onKeyDown={(e) =>
                handleButtonGroupKeyDown(
                  e,
                  [
                    { value: "beginner" as Difficulty },
                    { value: "intermediate" as Difficulty },
                    { value: "advanced" as Difficulty },
                  ],
                  difficulty,
                  setDifficulty
                )
              }
              tabIndex={difficulty === level ? 0 : -1}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-b-4 p-6 text-center transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                level === "beginner"
                  ? difficulty === level
                    ? "border-green-500 bg-green-500 text-white focus:ring-green-500"
                    : "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                  : level === "intermediate"
                  ? difficulty === level
                    ? "border-yellow-500 bg-yellow-500 text-white focus:ring-yellow-500"
                    : "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                  : difficulty === level
                  ? "border-red-500 bg-red-500 text-white focus:ring-red-500"
                  : "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
              } active:border-b-2`}
            >
              <span className="text-xl font-bold capitalize">{level}</span>
              <span className="mt-2 text-sm">
                {level === "beginner"
                  ? "Simple vocabulary and basic phrases"
                  : level === "intermediate"
                  ? "Sentence construction and grammar"
                  : "Complex conversations and idioms"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Question Count Selector */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-neutral-700">Number of Questions</h2>
        <div className="flex gap-4" role="group" aria-label="Select number of questions">
          {[5, 10, 15].map((count) => (
            <button
              key={count}
              onClick={() => setQuestionCount(count)}
              aria-pressed={questionCount === count}
              aria-label={`${count} questions`}
              onKeyDown={(e) =>
                handleButtonGroupKeyDown(
                  e,
                  [5, 10, 15].map((c) => ({ value: c })),
                  questionCount,
                  setQuestionCount
                )
              }
              tabIndex={questionCount === count ? 0 : -1}
              className={`flex-1 rounded-xl border-2 border-b-4 px-6 py-4 text-center font-bold transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                questionCount === count
                  ? "border-sky-500 bg-sky-500 text-white"
                  : "border-slate-200 bg-white text-neutral-700 hover:bg-slate-50"
              } active:border-b-2`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Question Type Checkboxes */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-neutral-700">Question Types</h2>
        <div className="flex flex-col gap-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-slate-200 p-4 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={questionTypes.includes("mcq")}
              onChange={() => toggleQuestionType("mcq")}
              className="h-5 w-5 rounded border-2 border-slate-300 text-green-500 focus:ring-2 focus:ring-green-500"
            />
            <span className="text-lg font-semibold text-neutral-700">MCQ</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-slate-200 p-4 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={questionTypes.includes("fill_blank")}
              onChange={() => toggleQuestionType("fill_blank")}
              className="h-5 w-5 rounded border-2 border-slate-300 text-green-500 focus:ring-2 focus:ring-green-500"
            />
            <span className="text-lg font-semibold text-neutral-700">Fill-in-the-blank</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-slate-200 p-4 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={questionTypes.includes("translation")}
              onChange={() => toggleQuestionType("translation")}
              className="h-5 w-5 rounded border-2 border-slate-300 text-green-500 focus:ring-2 focus:ring-green-500"
            />
            <span className="text-lg font-semibold text-neutral-700">Translation</span>
          </label>
        </div>
      </div>

      {/* Start Quiz Button */}
      <Button
        onClick={handleStartQuiz}
        disabled={isLoading || !selectedTopic || questionTypes.length === 0}
        variant="secondary"
        size="lg"
        className="w-full text-lg"
      >
        {isLoading ? "Generating Quiz..." : "Start Quiz"}
      </Button>
    </div>
  );
};
