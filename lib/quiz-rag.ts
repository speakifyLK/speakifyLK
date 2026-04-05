import { generateContent } from "@/lib/gemini";
import { parseGeminiQuizResponse, type ParsedQuestion } from "@/lib/quiz-normalise";
import { buildQuizPrompt, type Difficulty, type QuizType } from "@/lib/quiz-prompt";
import { retrieveContext } from "@/lib/vertex-rag";

const MAX_GEMINI_RETRIES = 2;

export type RagChunk = Awaited<ReturnType<typeof retrieveContext>>[number];

export interface RagQuizQuestion extends ParsedQuestion {
  type: QuizType;
}

/**
 * Builds a retrieval query focused on the quiz topic and difficulty so the RAG
 * store returns chunks suitable for assessment (vocabulary, examples, facts).
 */
export function buildQuizRagRetrievalQuery(topic: string, difficulty: Difficulty): string {
  const t = topic.trim();
  return [
    "SpeakifyLK Sinhala course content for quiz generation.",
    `Topic: ${t}.`,
    `Difficulty level: ${difficulty}.`,
    "Find lesson text, vocabulary, grammar points, and examples that can be tested in a quiz.",
  ].join(" ");
}

/**
 * Formats retrieved chunks as the string passed to {@link buildQuizPrompt} as
 * `ragContext` (quoted source material; sanitisation happens inside quiz-prompt).
 */
export function formatQuizRagChunksForPrompt(chunks: RagChunk[]): string {
  return chunks
    .filter((c) => c.text && c.text.trim().length > 0)
    .map((chunk, i) => `[Source ${i + 1} | relevance: ${chunk.score.toFixed(2)}]\n${chunk.text}`)
    .join("\n\n");
}

/**
 * Retrieves relevant course material from the Vertex RAG corpus for a quiz on
 * the given topic and difficulty.
 */
export async function getQuizContext(topic: string, difficulty: Difficulty): Promise<RagChunk[]> {
  const query = buildQuizRagRetrievalQuery(topic, difficulty);
  return retrieveContext(query);
}

async function callGeminiWithRetry(
  prompt: string,
  quizType: QuizType,
  expectedCount: number
): Promise<ParsedQuestion[]> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_GEMINI_RETRIES; attempt++) {
    const geminiResponse = await generateContent(prompt, {
      maxOutputTokens: 8192,
    });
    const responseText = geminiResponse.text ?? "";

    try {
      const questions = parseGeminiQuizResponse(responseText, quizType);
      if (questions.length !== expectedCount) {
        throw new Error(
          `Expected ${expectedCount} questions but Gemini returned ${questions.length}.`
        );
      }
      return questions;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_GEMINI_RETRIES) continue;
    }
  }

  throw new Error(
    `Failed to get valid RAG-grounded quiz JSON after ${MAX_GEMINI_RETRIES + 1} attempts. ` +
      `Last error: ${lastError?.message}`
  );
}

/**
 * Splits `total` questions across `types` using floor division, assigning the
 * remainder to the earliest types (same strategy as the quiz generate API).
 */
export function distributeQuestionCountByType(total: number, types: QuizType[]): Map<QuizType, number> {
  const map = new Map<QuizType, number>();
  for (const t of types) map.set(t, 0);

  const n = types.length;
  if (n === 0) return map;

  const base = Math.floor(total / n);
  const remainder = total % n;
  types.forEach((t, i) => {
    map.set(t, base + (i < remainder ? 1 : 0));
  });
  return map;
}

/**
 * Generates quiz questions using only retrieved course content. Uses
 * {@link buildQuizPrompt} templates with `ragContext` set so Gemini is
 * instructed to ground every question in the provided sources.
 *
 * @throws If no usable RAG chunks are returned, or if Gemini repeatedly returns invalid JSON.
 */
export async function generateQuizWithRAG(
  topic: string,
  difficulty: Difficulty,
  questionCount: number,
  questionTypes: QuizType[]
): Promise<RagQuizQuestion[]> {
  if (questionTypes.length === 0) {
    throw new Error('"questionTypes" must be a non-empty array.');
  }

  const chunks = await getQuizContext(topic, difficulty);
  const validChunks = chunks.filter((c) => c.text && c.text.trim().length > 0);

  if (validChunks.length === 0) {
    throw new Error(
      "No course content was retrieved for this topic. Cannot generate RAG-grounded questions."
    );
  }

  const ragContext = formatQuizRagChunksForPrompt(validChunks);
  const counts = distributeQuestionCountByType(questionCount, questionTypes);

  const out: RagQuizQuestion[] = [];

  for (const quizType of questionTypes) {
    const count = counts.get(quizType);
    if (!count) continue;

    const prompt = buildQuizPrompt(quizType, {
      topic,
      difficulty,
      count,
      ragContext,
    });

    const questions = await callGeminiWithRetry(prompt, quizType, count);
    out.push(...questions.map((q) => ({ ...q, type: quizType })));
  }

  return out;
}
