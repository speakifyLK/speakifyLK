import { test, expect } from "@playwright/test";
import {
  assertAiQuizSessionRagMetadataContract,
  assertAiQuizSessionRagMetadataWhenPresent,
  assertQuizRagRetrievalQueryShape,
  snapshotFormattedRagChunks,
  snapshotQuestionDistribution,
} from "./helpers/quiz-rag-e2e-shared";

/**
 * Contract tests for quiz RAG helpers (`lib/quiz-rag.ts`), executed in the
 * Playwright harness so behaviour stays aligned with production (same as
 * `rag-import-status` e2e + `lib/rag-import-status.test.ts`).
 */
test.describe("Quiz RAG (lib/quiz-rag)", () => {
  test("buildQuizRagRetrievalQuery includes SpeakifyLK preamble, topic, and difficulty", () => {
    expect(() => assertQuizRagRetrievalQueryShape("  numbers  ", "advanced")).not.toThrow();
  });

  test("distributeQuestionCountByType matches remainder-to-early-types strategy", () => {
    const snap = snapshotQuestionDistribution(7, [
      "MULTIPLE_CHOICE",
      "FILL_IN_BLANK",
      "TRANSLATION",
    ]);
    expect(snap).toEqual({
      MULTIPLE_CHOICE: 3,
      FILL_IN_BLANK: 2,
      TRANSLATION: 2,
    });
  });

  test("formatQuizRagChunksForPrompt labels sources with scores", () => {
    const text = snapshotFormattedRagChunks([
      { text: "ආයුබෝවන්", source: "lesson-1", score: 0.9123 },
    ]);
    expect(text).toContain("[Source 1 | relevance: 0.91]");
    expect(text).toContain("ආයුබෝවන්");
  });

  test("unauthenticated POST /api/quiz/generate still rejects (quiz pipeline protected)", async ({
    request,
  }) => {
    const response = await request.post("/api/quiz/generate", {
      data: {
        topic: "greetings",
        difficulty: "beginner",
        questionCount: 5,
        questionTypes: ["mcq"],
      },
    });
    expect(response.ok()).toBe(false);
  });

  test("quiz session RAG metadata contract matches persisted generate-route shape", () => {
    expect(() =>
      assertAiQuizSessionRagMetadataContract({
        rag: {
          provider: "vertex_rag_retrieveContexts",
          chunkCount: 1,
          chunkSources: [{ source: "gs://corpus/chunk", score: 0.91 }],
          groundedGeneration: true,
        },
      })
    ).not.toThrow();

    expect(() => assertAiQuizSessionRagMetadataWhenPresent(null)).not.toThrow();
  });
});
