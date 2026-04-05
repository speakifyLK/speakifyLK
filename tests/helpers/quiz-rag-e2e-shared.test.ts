import { describe, it, expect, vi, afterEach } from "vitest";

import * as quizRag from "../../lib/quiz-rag";
import {
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
});
