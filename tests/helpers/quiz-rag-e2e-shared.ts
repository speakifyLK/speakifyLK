import {
  buildQuizRagRetrievalQuery,
  distributeQuestionCountByType,
  formatQuizRagChunksForPrompt,
  type RagChunk,
} from "../../lib/quiz-rag";
import type { Difficulty, QuizType } from "../../lib/quiz-prompt";

/**
 * Shared assertions for Playwright e2e and Vitest — mirrors {@link lib/quiz-rag.ts}
 * contracts without duplicating business logic.
 */
export function assertQuizRagRetrievalQueryShape(topic: string, difficulty: Difficulty): void {
  const q = buildQuizRagRetrievalQuery(topic, difficulty);
  if (!q.includes("SpeakifyLK Sinhala course content for quiz generation.")) {
    throw new Error("retrieval query missing SpeakifyLK preamble");
  }
  if (!q.includes(`Topic: ${topic.trim()}.`)) {
    throw new Error("retrieval query missing trimmed topic line");
  }
  if (!q.includes(`Difficulty level: ${difficulty}.`)) {
    throw new Error("retrieval query missing difficulty line");
  }
}

export function snapshotQuestionDistribution(
  total: number,
  types: QuizType[]
): Record<string, number> {
  const m = distributeQuestionCountByType(total, types);
  return Object.fromEntries(m.entries());
}

export function snapshotFormattedRagChunks(chunks: RagChunk[]): string {
  return formatQuizRagChunksForPrompt(chunks);
}
