"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { units, lessons } from "@/db/schema";

type Unit = typeof units.$inferSelect & {
  lessons: (typeof lessons.$inferSelect & { completed: boolean })[];
};

type QuizConfigProps = {
  units: Unit[];
};

type Difficulty = "beginner" | "intermediate" | "advanced";
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
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
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

    setIsLoading(true);

    try {
      const selectedUnit = units.find((u) => u.id === selectedTopic);
      if (!selectedUnit) {
        toast.error("Selected topic not found");
        return;
      }

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
      toast.success("Quiz generated successfully!");
      // TODO: Redirect to quiz session page when /quiz/[sessionId] route is created
      // For now, redirect back to quiz config page
      router.push("/quiz");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start quiz"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Topic Selector Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-neutral-700">Select Topic</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {units.map((unit) => (
            <button
              key={unit.id}
              onClick={() => setSelectedTopic(unit.id)}
              className={`
                flex flex-col items-start justify-between rounded-xl border-2 border-b-4 p-4 text-left transition-all
                ${
                  selectedTopic === unit.id
                    ? "border-green-500 bg-green-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }
                active:border-b-2
              `}
            >
              <div className="w-full">
                <h3 className="text-lg font-bold text-neutral-700">
                  {unit.title}
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  {unit.description}
                </p>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <button
            onClick={() => setDifficulty("beginner")}
            className={`
              flex flex-col items-center justify-center rounded-xl border-2 border-b-4 p-6 text-center transition-all
              ${
                difficulty === "beginner"
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
              }
              active:border-b-2
            `}
          >
            <span className="text-xl font-bold">Beginner</span>
            <span className="mt-2 text-sm">
              Simple vocabulary and basic phrases
            </span>
          </button>
          <button
            onClick={() => setDifficulty("intermediate")}
            className={`
              flex flex-col items-center justify-center rounded-xl border-2 border-b-4 p-6 text-center transition-all
              ${
                difficulty === "intermediate"
                  ? "border-yellow-500 bg-yellow-500 text-white"
                  : "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
              }
              active:border-b-2
            `}
          >
            <span className="text-xl font-bold">Intermediate</span>
            <span className="mt-2 text-sm">
              Sentence construction and grammar
            </span>
          </button>
          <button
            onClick={() => setDifficulty("advanced")}
            className={`
              flex flex-col items-center justify-center rounded-xl border-2 border-b-4 p-6 text-center transition-all
              ${
                difficulty === "advanced"
                  ? "border-red-500 bg-red-500 text-white"
                  : "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
              }
              active:border-b-2
            `}
          >
            <span className="text-xl font-bold">Advanced</span>
            <span className="mt-2 text-sm">
              Complex conversations and idioms
            </span>
          </button>
        </div>
      </div>

      {/* Question Count Selector */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-neutral-700">Number of Questions</h2>
        <div className="flex gap-4">
          {[5, 10, 15].map((count) => (
            <button
              key={count}
              onClick={() => setQuestionCount(count)}
              className={`
                flex-1 rounded-xl border-2 border-b-4 px-6 py-4 text-center font-bold transition-all
                ${
                  questionCount === count
                    ? "border-sky-500 bg-sky-500 text-white"
                    : "border-slate-200 bg-white text-neutral-700 hover:bg-slate-50"
                }
                active:border-b-2
              `}
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
            <span className="text-lg font-semibold text-neutral-700">
              Fill-in-the-blank
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-slate-200 p-4 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={questionTypes.includes("translation")}
              onChange={() => toggleQuestionType("translation")}
              className="h-5 w-5 rounded border-2 border-slate-300 text-green-500 focus:ring-2 focus:ring-green-500"
            />
            <span className="text-lg font-semibold text-neutral-700">
              Translation
            </span>
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

