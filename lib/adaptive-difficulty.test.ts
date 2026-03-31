import { describe, it, expect } from "vitest";
import {
  selectLastSessionsForTopic,
  averageScores,
  computeAdaptiveDifficultyRecommendation,
  type AdaptiveQuizHistorySession,
} from "./adaptive-difficulty";

// ── Helper to generate test session data ──────────────────────────────

function makeSessions(
  scores: number[],
  topic = "greetings",
  completed = true
): AdaptiveQuizHistorySession[] {
  return scores.map((score, i) => ({
    topic,
    score,
    startedAt: new Date(2026, 0, i + 1),
    completedAt: completed ? new Date(2026, 0, i + 1, 1) : null,
  }));
}

// ═══════════════════════════════════════════════════════════════════════
// selectLastSessionsForTopic
// ═══════════════════════════════════════════════════════════════════════

describe("selectLastSessionsForTopic", () => {
  it("filters sessions by topic name", () => {
    const sessions = [
      ...makeSessions([90, 80], "greetings"),
      ...makeSessions([70, 60], "verbs"),
    ];
    const result = selectLastSessionsForTopic(sessions, "greetings");
    expect(result.every((s) => s.topic === "greetings")).toBe(true);
  });

  it("limits results to the specified limit (default 5)", () => {
    const sessions = makeSessions([90, 80, 70, 60, 50, 40, 30]);
    const result = selectLastSessionsForTopic(sessions, "greetings");
    expect(result).toHaveLength(5);
  });

  it("respects custom limit parameter", () => {
    const sessions = makeSessions([90, 80, 70, 60, 50]);
    const result = selectLastSessionsForTopic(sessions, "greetings", 3);
    expect(result).toHaveLength(3);
  });

  it("excludes incomplete sessions (completedAt is null)", () => {
    const sessions: AdaptiveQuizHistorySession[] = [
      { topic: "greetings", score: 90, startedAt: new Date(), completedAt: null },
      { topic: "greetings", score: 80, startedAt: new Date(), completedAt: new Date() },
    ];
    const result = selectLastSessionsForTopic(sessions, "greetings");
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(80);
  });

  it("returns empty array when no sessions match", () => {
    const sessions = makeSessions([90], "verbs");
    const result = selectLastSessionsForTopic(sessions, "greetings");
    expect(result).toHaveLength(0);
  });

  it("handles empty input array", () => {
    expect(selectLastSessionsForTopic([], "greetings")).toHaveLength(0);
  });

  it("trims topic name for comparison", () => {
    const sessions = makeSessions([90], "greetings");
    const result = selectLastSessionsForTopic(sessions, "  greetings  ");
    expect(result).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// averageScores
// ═══════════════════════════════════════════════════════════════════════

describe("averageScores", () => {
  it("returns null for empty array", () => {
    expect(averageScores([])).toBeNull();
  });

  it("returns the score itself for a single session", () => {
    expect(averageScores(makeSessions([85]))).toBe(85);
  });

  it("computes correct average for multiple sessions", () => {
    expect(averageScores(makeSessions([80, 60, 100]))).toBe(80);
  });

  it("handles all-zero scores", () => {
    expect(averageScores(makeSessions([0, 0, 0]))).toBe(0);
  });

  it("handles perfect scores", () => {
    expect(averageScores(makeSessions([100, 100, 100]))).toBe(100);
  });

  it("returns decimal average when not evenly divisible", () => {
    const avg = averageScores(makeSessions([90, 80, 70]));
    expect(avg).toBe(80);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// computeAdaptiveDifficultyRecommendation
// ═══════════════════════════════════════════════════════════════════════

describe("computeAdaptiveDifficultyRecommendation", () => {
  it("returns null when no completed sessions exist for the topic", () => {
    expect(
      computeAdaptiveDifficultyRecommendation([], "greetings", "beginner")
    ).toBeNull();
  });

  it("returns null when only incomplete sessions exist", () => {
    const sessions = makeSessions([90, 85], "greetings", false);
    expect(
      computeAdaptiveDifficultyRecommendation(sessions, "greetings", "beginner")
    ).toBeNull();
  });

  // ── Upgrade rules ──

  it("recommends stepping UP from beginner to intermediate when avg > 80", () => {
    const result = computeAdaptiveDifficultyRecommendation(
      makeSessions([90, 85, 95]),
      "greetings",
      "beginner"
    );
    expect(result).not.toBeNull();
    expect(result!.recommendedDifficulty).toBe("intermediate");
  });

  it("recommends stepping UP from intermediate to advanced when avg > 80", () => {
    const result = computeAdaptiveDifficultyRecommendation(
      makeSessions([90, 85, 95]),
      "greetings",
      "intermediate"
    );
    expect(result!.recommendedDifficulty).toBe("advanced");
  });

  it("does NOT exceed advanced ceiling", () => {
    const result = computeAdaptiveDifficultyRecommendation(
      makeSessions([90, 95, 100]),
      "greetings",
      "advanced"
    );
    expect(result!.recommendedDifficulty).toBe("advanced");
  });

  // ── Downgrade rules ──

  it("recommends stepping DOWN from advanced to intermediate when avg < 40", () => {
    const result = computeAdaptiveDifficultyRecommendation(
      makeSessions([20, 30, 35]),
      "greetings",
      "advanced"
    );
    expect(result!.recommendedDifficulty).toBe("intermediate");
  });

  it("recommends stepping DOWN from intermediate to beginner when avg < 40", () => {
    const result = computeAdaptiveDifficultyRecommendation(
      makeSessions([20, 30, 35]),
      "greetings",
      "intermediate"
    );
    expect(result!.recommendedDifficulty).toBe("beginner");
  });

  it("does NOT go below beginner floor", () => {
    const result = computeAdaptiveDifficultyRecommendation(
      makeSessions([10, 15, 20]),
      "greetings",
      "beginner"
    );
    expect(result!.recommendedDifficulty).toBe("beginner");
  });

  // ── Stay at current level ──

  it("stays at current level for mid-range scores (40–80)", () => {
    const result = computeAdaptiveDifficultyRecommendation(
      makeSessions([50, 60, 70]),
      "greetings",
      "intermediate"
    );
    expect(result!.recommendedDifficulty).toBe("intermediate");
  });

  it("stays at current level when avg is exactly 80 (boundary)", () => {
    const result = computeAdaptiveDifficultyRecommendation(
      makeSessions([80, 80, 80]),
      "greetings",
      "beginner"
    );
    expect(result!.recommendedDifficulty).toBe("beginner");
  });

  it("stays at current level when avg is exactly 40 (boundary)", () => {
    const result = computeAdaptiveDifficultyRecommendation(
      makeSessions([40, 40, 40]),
      "greetings",
      "intermediate"
    );
    expect(result!.recommendedDifficulty).toBe("intermediate");
  });

  // ── Error / invalid inputs ──

  it("handles invalid current difficulty gracefully (treats as beginner and steps up)", () => {
    const result = computeAdaptiveDifficultyRecommendation(
      makeSessions([90, 85, 95]),
      "greetings",
      "invalid-difficulty" as any
    );
    expect(result!.recommendedDifficulty).toBe("intermediate");
  });

  it("handles invalid current difficulty gracefully (treats as beginner and stays at beginner when stepping down)", () => {
    const result = computeAdaptiveDifficultyRecommendation(
      makeSessions([20, 30, 35]),
      "greetings",
      "invalid-difficulty" as any
    );
    expect(result!.recommendedDifficulty).toBe("beginner");
  });

  // ── Result shape ──

  it("returns correct shape with all fields", () => {
    const result = computeAdaptiveDifficultyRecommendation(
      makeSessions([90, 85, 95]),
      "greetings",
      "beginner"
    );
    expect(result).toMatchObject({
      topicTitle: "greetings",
      averageScore: 90,
      sessionCount: 3,
      recommendedDifficulty: "intermediate",
    });
    expect(result!.message).toContain("Intermediate");
    expect(result!.message).toContain("greetings");
  });
});
