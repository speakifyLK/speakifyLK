import type { Difficulty } from "@/lib/quiz-prompt";

/** Shape compatible with rows returned from `getQuizHistory()` (dates may be ISO strings from RSC → client). */
export type AdaptiveQuizHistorySession = {
  topic: string;
  difficulty?: string;
  score: number;
  startedAt: Date | string;
  completedAt: Date | string | null;
};

export type AdaptiveDifficultyRecommendation = {
  topicTitle: string;
  averageScore: number;
  sessionCount: number;
  recommendedDifficulty: Difficulty;
  message: string;
};

const ORDER: readonly Difficulty[] = ["beginner", "intermediate", "advanced"];

function formatDifficultyLabel(level: Difficulty): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function stepDifficulty(current: Difficulty, direction: "up" | "down"): Difficulty {
  const i = ORDER.indexOf(current);
  const base = i === -1 ? 0 : i;
  if (direction === "up") return ORDER[Math.min(base + 1, ORDER.length - 1)];
  return ORDER[Math.max(base - 1, 0)];
}

/**
 * Last N completed quiz sessions for a topic, newest first (relies on `getQuizHistory()` sort).
 */
export function selectLastSessionsForTopic(
  sessions: AdaptiveQuizHistorySession[],
  topicTitle: string,
  limit = 5
): AdaptiveQuizHistorySession[] {
  const normalized = topicTitle.trim();
  return sessions
    .filter((s) => s.topic.trim() === normalized && s.completedAt != null)
    .slice(0, limit);
}

export function averageScores(sessions: AdaptiveQuizHistorySession[]): number | null {
  if (sessions.length === 0) return null;
  const sum = sessions.reduce((acc, s) => acc + s.score, 0);
  return sum / sessions.length;
}

/**
 * Returns the difficulty level the user most recently played for the given topic.
 * Falls back to `fallback` (default "beginner") when there is no history.
 * Use this instead of the user's currently-selected UI value so the recommendation
 * stays stable when the user clicks different difficulty buttons.
 */
export function getBaselineDifficulty(
  sessions: AdaptiveQuizHistorySession[],
  topicTitle: string,
  fallback: Difficulty = "beginner"
): Difficulty {
  const recent = selectLastSessionsForTopic(sessions, topicTitle, 1);
  if (recent.length === 0 || !recent[0].difficulty) return fallback;
  const d = recent[0].difficulty as Difficulty;
  return ORDER.includes(d) ? d : fallback;
}

/**
 * Uses the last up to 5 completed sessions for `topicTitle` from history (from `getQuizHistory()`),
 * rolling average score, and `currentDifficulty` as the baseline for upgrade/downgrade rules.
 */
export function computeAdaptiveDifficultyRecommendation(
  allSessions: AdaptiveQuizHistorySession[],
  topicTitle: string,
  currentDifficulty: Difficulty
): AdaptiveDifficultyRecommendation | null {
  const recent = selectLastSessionsForTopic(allSessions, topicTitle, 5);
  const avg = averageScores(recent);
  if (avg === null) return null;

  let recommendedDifficulty: Difficulty = currentDifficulty;
  if (avg > 80) {
    recommendedDifficulty = stepDifficulty(currentDifficulty, "up");
  } else if (avg < 40) {
    recommendedDifficulty = stepDifficulty(currentDifficulty, "down");
  }

  const topicLabel = topicTitle.trim();
  const levelLabel = formatDifficultyLabel(recommendedDifficulty);
  const message = `Based on your performance, we recommend ${levelLabel} difficulty for ${topicLabel}.`;

  return {
    topicTitle: topicLabel,
    averageScore: avg,
    sessionCount: recent.length,
    recommendedDifficulty,
    message,
  };
}
