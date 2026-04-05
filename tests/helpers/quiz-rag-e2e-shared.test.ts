import { describe, it, expect, vi, afterEach } from "vitest";

import type { AiQuizSessionMetadata } from "../../db/schema";
import * as quizRag from "../../lib/quiz-rag";
import {
  assertAiQuizSessionRagMetadataContract,
  assertAiQuizSessionRagMetadataWhenPresent,
  assertQuizRagRetrievalQueryShape,
  snapshotFormattedRagChunks,
  snapshotQuestionDistribution,
} from "./quiz-rag-e2e-shared";

describe("quiz-rag-e2e-shared", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("assertQuizRagRetrievalQueryShape succeeds when the query matches the contract", () => {
    expect(() => assertQuizRagRetrievalQueryShape("verbs", "intermediate")).not.toThrow();
  });

  it("assertQuizRagRetrievalQueryShape throws when the SpeakifyLK preamble is missing", () => {
    vi.spyOn(quizRag, "buildQuizRagRetrievalQuery").mockReturnValue("wrong");
    expect(() => assertQuizRagRetrievalQueryShape("x", "beginner")).toThrow("SpeakifyLK");
  });

  it("assertQuizRagRetrievalQueryShape throws when the topic line is wrong", () => {
    vi.spyOn(quizRag, "buildQuizRagRetrievalQuery").mockReturnValue(
      "SpeakifyLK Sinhala course content for quiz generation.\nTopic: other.\nDifficulty level: beginner."
    );
    expect(() => assertQuizRagRetrievalQueryShape("expected", "beginner")).toThrow(
      "trimmed topic line"
    );
  });

  it("assertQuizRagRetrievalQueryShape throws when the difficulty line is wrong", () => {
    vi.spyOn(quizRag, "buildQuizRagRetrievalQuery").mockReturnValue(
      "SpeakifyLK Sinhala course content for quiz generation.\nTopic: hello.\nDifficulty level: wrong."
    );
    expect(() => assertQuizRagRetrievalQueryShape("hello", "beginner")).toThrow("difficulty line");
  });

  it("snapshotQuestionDistribution delegates to distributeQuestionCountByType", () => {
    expect(snapshotQuestionDistribution(2, ["MULTIPLE_CHOICE", "FILL_IN_BLANK"])).toEqual({
      MULTIPLE_CHOICE: 1,
      FILL_IN_BLANK: 1,
    });
  });

  it("snapshotFormattedRagChunks delegates to formatQuizRagChunksForPrompt", () => {
    const s = snapshotFormattedRagChunks([{ text: "x", source: "s", score: 1 }]);
    expect(s).toContain("x");
    expect(s).toContain("[Source 1");
  });

  it("assertAiQuizSessionRagMetadataWhenPresent is a no-op for nullish metadata", () => {
    expect(() => assertAiQuizSessionRagMetadataWhenPresent(null)).not.toThrow();
    expect(() => assertAiQuizSessionRagMetadataWhenPresent(undefined)).not.toThrow();
  });

  it("assertAiQuizSessionRagMetadataContract accepts a valid grounded payload", () => {
    expect(() =>
      assertAiQuizSessionRagMetadataContract({
        rag: {
          provider: "vertex_rag_retrieveContexts",
          chunkCount: 2,
          chunkSources: [
            { source: "gs://a", score: 0.91 },
            { source: "gs://b", score: 0.82 },
          ],
          groundedGeneration: true,
        },
      })
    ).not.toThrow();
  });

  it("assertAiQuizSessionRagMetadataContract rejects missing rag", () => {
    expect(() => assertAiQuizSessionRagMetadataContract({})).toThrow("metadata.rag is required");
  });

  it("assertAiQuizSessionRagMetadataContract rejects wrong provider", () => {
    const invalid = {
      rag: {
        provider: "other",
        chunkCount: 1,
        chunkSources: [{ source: "x", score: 1 }],
        groundedGeneration: true,
      },
    };
    expect(() => assertAiQuizSessionRagMetadataContract(invalid as AiQuizSessionMetadata)).toThrow(
      "unexpected RAG provider"
    );
  });

  it("assertAiQuizSessionRagMetadataContract rejects invalid chunkCount", () => {
    expect(() =>
      assertAiQuizSessionRagMetadataContract({
        rag: {
          provider: "vertex_rag_retrieveContexts",
          chunkCount: 0,
          chunkSources: [],
          groundedGeneration: false,
        },
      })
    ).toThrow("positive integer");

    expect(() =>
      assertAiQuizSessionRagMetadataContract({
        rag: {
          provider: "vertex_rag_retrieveContexts",
          chunkCount: 1.5 as unknown as number,
          chunkSources: [{ source: "x", score: 1 }],
          groundedGeneration: false,
        },
      })
    ).toThrow("positive integer");
  });

  it("assertAiQuizSessionRagMetadataContract rejects chunkSources length mismatch", () => {
    expect(() =>
      assertAiQuizSessionRagMetadataContract({
        rag: {
          provider: "vertex_rag_retrieveContexts",
          chunkCount: 2,
          chunkSources: [{ source: "a", score: 1 }],
          groundedGeneration: false,
        },
      })
    ).toThrow("chunkSources length");
  });

  it("assertAiQuizSessionRagMetadataContract rejects invalid chunk source or score", () => {
    expect(() =>
      assertAiQuizSessionRagMetadataContract({
        rag: {
          provider: "vertex_rag_retrieveContexts",
          chunkCount: 1,
          chunkSources: [{ source: "", score: 1 }],
          groundedGeneration: false,
        },
      })
    ).toThrow("non-empty string");

    expect(() =>
      assertAiQuizSessionRagMetadataContract({
        rag: {
          provider: "vertex_rag_retrieveContexts",
          chunkCount: 1,
          chunkSources: [{ source: "ok", score: Number.NaN }],
          groundedGeneration: false,
        },
      })
    ).toThrow("finite number");

    expect(() =>
      assertAiQuizSessionRagMetadataContract({
        rag: {
          provider: "vertex_rag_retrieveContexts",
          chunkCount: 1,
          chunkSources: [{ source: "ok", score: "0.5" as unknown as number }],
          groundedGeneration: false,
        },
      })
    ).toThrow("finite number");

    expect(() =>
      assertAiQuizSessionRagMetadataContract({
        rag: {
          provider: "vertex_rag_retrieveContexts",
          chunkCount: 1,
          chunkSources: [{ source: "ok", score: Number.POSITIVE_INFINITY }],
          groundedGeneration: false,
        },
      })
    ).toThrow("finite number");
  });

  it("assertAiQuizSessionRagMetadataContract rejects non-boolean groundedGeneration", () => {
    expect(() =>
      assertAiQuizSessionRagMetadataContract({
        rag: {
          provider: "vertex_rag_retrieveContexts",
          chunkCount: 1,
          chunkSources: [{ source: "x", score: 1 }],
          groundedGeneration: "yes" as unknown as boolean,
        },
      })
    ).toThrow("boolean");
  });

  it("assertAiQuizSessionRagMetadataWhenPresent delegates when metadata is present", () => {
    expect(() =>
      assertAiQuizSessionRagMetadataWhenPresent({
        rag: {
          provider: "vertex_rag_retrieveContexts",
          chunkCount: 1,
          chunkSources: [{ source: "lesson", score: 0.5 }],
          groundedGeneration: false,
        },
      })
    ).not.toThrow();
  });
});
