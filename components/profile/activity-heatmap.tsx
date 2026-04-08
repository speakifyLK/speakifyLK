"use client";

import { useMemo } from "react";

type ActivityDay = {
  date: string;
  lessonsCompleted: number;
  quizzesCompleted: number;
  xpEarned: number;
};

type ActivityHeatmapProps = {
  activityData: ActivityDay[];
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

function getIntensityLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

const INTENSITY_COLORS = [
  "bg-slate-100", // 0 - no activity
  "bg-green-200", // 1 - light
  "bg-green-400", // 2 - medium
  "bg-green-500", // 3 - high
  "bg-green-700", // 4 - very high
];

export const ActivityHeatmap = ({ activityData }: ActivityHeatmapProps) => {
  const { weeks, monthLabels } = useMemo(() => {
    // Build a map from date -> activity count
    const activityMap = new Map<string, number>();
    for (const day of activityData) {
      const total = day.lessonsCompleted + day.quizzesCompleted;
      activityMap.set(day.date, total);
    }

    // Build 52 weeks of data ending today
    const today = new Date();
    // Normalize to UTC midnight to avoid local-timezone date shifts
    today.setUTCHours(0, 0, 0, 0);
    const totalDays = 52 * 7;
    const startDate = new Date(today);
    startDate.setUTCDate(startDate.getUTCDate() - totalDays + 1);

    // Align to the start of the week (Sunday) using UTC day
    const dayOfWeek = startDate.getUTCDay();
    startDate.setUTCDate(startDate.getUTCDate() - dayOfWeek);

    const weeksArr: Array<
      Array<{ date: string; count: number; level: number; isInRange: boolean }>
    > = [];
    const labels: Array<{ label: string; col: number }> = [];

    const currentDate = new Date(startDate);
    let currentMonth = -1;

    const realStartDate = new Date(today);
    realStartDate.setUTCDate(realStartDate.getUTCDate() - totalDays + 1);

    let weekIndex = 0;

    while (currentDate <= today) {
      const week: Array<{
        date: string;
        count: number;
        level: number;
        isInRange: boolean;
      }> = [];

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const dateStr = currentDate.toISOString().slice(0, 10);
        const count = activityMap.get(dateStr) ?? 0;
        const isInRange = currentDate >= realStartDate && currentDate <= today;

        week.push({
          date: dateStr,
          count,
          level: isInRange ? getIntensityLevel(count) : -1,
          isInRange,
        });

        // Track month labels (use UTC month)
        const month = currentDate.getUTCMonth();
        if (month !== currentMonth && dayIdx === 0) {
          currentMonth = month;
          labels.push({ label: MONTHS[month], col: weekIndex });
        }

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }

      weeksArr.push(week);
      weekIndex++;
    }

    return { weeks: weeksArr, monthLabels: labels };
  }, [activityData]);

  return (
    <div className="w-full">
      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="mb-1 flex">
            <div className="w-8 shrink-0" />
            <div className="relative flex flex-1">
              {monthLabels.map((m, i) => (
                <span
                  key={`${m.label}-${i}`}
                  className="absolute text-xs text-muted-foreground"
                  style={{ left: `${m.col * 14}px` }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="mt-4 flex gap-0.5">
            {/* Day labels */}
            <div className="mr-1 flex shrink-0 flex-col gap-0.5">
              {DAYS.map((day, i) => (
                <div
                  key={i}
                  className="flex h-[11px] w-6 items-center text-[9px] leading-none text-muted-foreground sm:h-[13px] sm:text-[10px]"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-0.5">
                {week.map((day, dayIdx) => (
                  <div
                    key={`${weekIdx}-${dayIdx}`}
                    className={`h-[11px] w-[11px] rounded-[2px] sm:h-[13px] sm:w-[13px] ${
                      !day.isInRange
                        ? "bg-transparent"
                        : INTENSITY_COLORS[day.level]
                    }`}
                    title={
                      day.isInRange
                        ? `${day.date}: ${day.count} activit${day.count === 1 ? "y" : "ies"}`
                        : ""
                    }
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <span>Less</span>
            {INTENSITY_COLORS.map((color, i) => (
              <div
                key={i}
                className={`h-[11px] w-[11px] rounded-[2px] sm:h-[13px] sm:w-[13px] ${color}`}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
};
