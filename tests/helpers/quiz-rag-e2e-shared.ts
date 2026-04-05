import type { AiQuizSessionMetadata } from "../../db/schema";
import {
  buildQuizRagRetrievalQuery,
  distributeQuestionCountByType,
  formatQuizRagChunksForPrompt,
  type RagChunk,
} from "../../lib/quiz-rag";
import type { Difficulty, QuizType } from "../../lib/quiz-prompt";

/**
 * Shared assertions for Playwright e2e and Vitest — mirrors {@link lib/quiz-rag.ts}
 * contracts and the RAG trace JSON stored in `ai_quiz_sessions.metadata` by
 * POST /api/quiz/generate, without duplicating business logic.
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

/**
 * Validates {@link AiQuizSessionMetadata} as persisted by POST /api/quiz/generate
 * when RAG chunks were retrieved (traceability contract).
 */
export function assertAiQuizSessionRagMetadataContract(metadata: AiQuizSessionMetadata): void {
  const rag = metadata.rag;
  if (!rag) {
    throw new Error("metadata.rag is required when asserting RAG traceability");
  }
  if (rag.provider !== "vertex_rag_retrieveContexts") {
    throw new Error(`unexpected RAG provider: ${String(rag.provider)}`);
  }
  if (!Number.isInteger(rag.chunkCount) || rag.chunkCount < 1) {
    throw new Error("chunkCount must be a positive integer");
  }
  if (!Array.isArray(rag.chunkSources) || rag.chunkSources.length !== rag.chunkCount) {
    throw new Error("chunkSources length must match chunkCount");
  }
  for (let i = 0; i < rag.chunkSources.length; i++) {
    const c = rag.chunkSources[i];
    if (typeof c?.source !== "string" || c.source.length === 0) {
      throw new Error(`chunkSources[${i}].source must be a non-empty string`);
    }
    if (typeof c.score !== "number" || Number.isNaN(c.score)) {
      throw new Error(`chunkSources[${i}].score must be a finite number`);
    }
  }
  if (typeof rag.groundedGeneration !== "boolean") {
    throw new Error("groundedGeneration must be a boolean");
  }
}

/** No-op when metadata is absent; otherwise enforces the RAG trace shape. */
export function assertAiQuizSessionRagMetadataWhenPresent(
  metadata: AiQuizSessionMetadata | null | undefined
): void {
  if (metadata == null) return;
  assertAiQuizSessionRagMetadataContract(metadata);
}
