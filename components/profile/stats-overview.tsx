import { BookOpen, Brain, Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";

type StatsOverviewProps = {
  totalXp: number;
  totalLessonsCompleted: number;
  totalQuizzesCompleted: number;
  averageQuizScore: number;
  improvementTrend: "improving" | "declining" | "stable";
  favouriteTopic: string | null;
};

export const StatsOverview = ({
  totalXp,
  totalLessonsCompleted,
  totalQuizzesCompleted,
  averageQuizScore,
  improvementTrend,
  favouriteTopic,
}: StatsOverviewProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-neutral-800">Learning Analytics</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3">
        {/* Total XP */}
        <div className="rounded-xl border-2 bg-white p-4 shadow-sm">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
            <Zap className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-xl font-extrabold text-neutral-800">{totalXp.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total XP</p>
        </div>

        {/* Lessons */}
        <div className="rounded-xl border-2 bg-white p-4 shadow-sm">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100">
            <BookOpen className="h-5 w-5 text-sky-500" />
          </div>
          <p className="text-xl font-extrabold text-neutral-800">{totalLessonsCompleted}</p>
          <p className="text-xs text-muted-foreground">Lessons done</p>
        </div>

        {/* Quizzes */}
        <div className="rounded-xl border-2 bg-white p-4 shadow-sm">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
            <Brain className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-xl font-extrabold text-neutral-800">{totalQuizzesCompleted}</p>
          <p className="text-xs text-muted-foreground">Quizzes taken</p>
        </div>

        {/* Average score */}
        <div className="rounded-xl border-2 bg-white p-4 shadow-sm">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
            <Zap className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-xl font-extrabold text-neutral-800">{averageQuizScore}%</p>
          <p className="text-xs text-muted-foreground">Avg quiz score</p>
        </div>

        {/* Trend */}
        <div className="rounded-xl border-2 bg-white p-4 shadow-sm">
          <div
            className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg ${
              improvementTrend === "improving"
                ? "bg-green-100"
                : improvementTrend === "declining"
                  ? "bg-rose-100"
                  : "bg-slate-100"
            }`}
          >
            {improvementTrend === "improving" ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : improvementTrend === "declining" ? (
              <TrendingDown className="h-5 w-5 text-rose-500" />
            ) : (
              <Minus className="h-5 w-5 text-slate-500" />
            )}
          </div>
          <p className="text-xl font-extrabold capitalize text-neutral-800">{improvementTrend}</p>
          <p className="text-xs text-muted-foreground">Performance</p>
        </div>

        {/* Favourite topic */}
        {favouriteTopic && (
          <div className="rounded-xl border-2 bg-white p-4 shadow-sm">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <BookOpen className="h-5 w-5 text-amber-500" />
            </div>
            <p className="truncate text-xl font-extrabold text-neutral-800">{favouriteTopic}</p>
            <p className="text-xs text-muted-foreground">Top topic</p>
          </div>
        )}
      </div>
    </div>
  );
};
