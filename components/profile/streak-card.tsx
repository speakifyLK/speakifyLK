import { Flame, Trophy, Calendar } from "lucide-react";

type StreakCardProps = {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
};

export const StreakCard = ({
  currentStreak,
  longestStreak,
  totalActiveDays,
}: StreakCardProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Current streak */}
      <div className="flex items-center gap-3 rounded-xl border-2 bg-white p-4 shadow-sm">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-100">
          <Flame className="h-6 w-6 text-orange-500" />
        </div>
        <div>
          <p className="text-2xl font-extrabold text-neutral-800">
            {currentStreak}
          </p>
          <p className="text-sm text-muted-foreground">Day streak</p>
        </div>
      </div>

      {/* Longest streak */}
      <div className="flex items-center gap-3 rounded-xl border-2 bg-white p-4 shadow-sm">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100">
          <Trophy className="h-6 w-6 text-amber-500" />
        </div>
        <div>
          <p className="text-2xl font-extrabold text-neutral-800">
            {longestStreak}
          </p>
          <p className="text-sm text-muted-foreground">Longest streak</p>
        </div>
      </div>

      {/* Total active days */}
      <div className="flex items-center gap-3 rounded-xl border-2 bg-white p-4 shadow-sm">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-100">
          <Calendar className="h-6 w-6 text-green-500" />
        </div>
        <div>
          <p className="text-2xl font-extrabold text-neutral-800">
            {totalActiveDays}
          </p>
          <p className="text-sm text-muted-foreground">Active days</p>
        </div>
      </div>
    </div>
  );
};
