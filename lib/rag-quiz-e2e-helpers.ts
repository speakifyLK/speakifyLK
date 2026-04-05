/**
 * Pure helpers and HTTP/validation utilities for `scripts/test-rag-quiz.ts`.
 * Kept in `lib/` so Vitest can reach 100% coverage without executing the CLI entrypoint.
 */

export const RAG_E2E_TOPIC = "Greetings";
export const RAG_E2E_DIFFICULTY = "beginner";
export const RAG_E2E_API_QUESTION_COUNT = 9;
export const RAG_E2E_API_TYPES = ["mcq", "fill_blank", "translation"] as const;

const SINHALA_RE = /[\u0D80-\u0DFF]/;

export function hasSinhala(text: string): boolean {
  return SINHALA_RE.test(text);
}

export function buildVocabSet(texts: string[]): Set<string> {
  const vocab = new Set<string>();
  for (const t of texts) {
    t.toLowerCase()
      .split(/[\s,.'"!;:()\-\n]+/)
      .filter((w) => w.length >= 2)
      .forEach((w) => vocab.add(w));
  }
  return vocab;
}

export function overlapPct(text: string, vocab: Set<string>): number {
  if (vocab.size === 0) return -1;
  const words = text
    .toLowerCase()
    .split(/[\s,.'"!;:()\-\n]+/)
    .filter((w) => w.length >= 2);
  if (words.length === 0) return 0;
  return Math.round((words.filter((w) => vocab.has(w)).length / words.length) * 100);
}

/** Known Unit 1 phrases; a hit strengthens the claim that content is course-aligned. */
export const GREETING_ANCHORS = [
  "ආයුබෝවන්",
  "aayubowan",
  "ස්තූතියි",
  "sthuthi",
  "subha",
  "hello",
  "thank",
];

export function anchorHitsInText(text: string): string[] {
  const lower = text.toLowerCase();
  return GREETING_ANCHORS.filter((a) => lower.includes(a.toLowerCase()));
}

export interface Tally {
  errors: number;
  warnings: number;
}

export interface McqOption {
  text: string;
  isCorrect: boolean;
}

export interface ApiQuestionRow {
  id: number;
  type: string;
  question: string;
  correctAnswer: string;
  options?: unknown;
  explanation?: string;
}

export type InternalType = "MULTIPLE_CHOICE" | "FILL_IN_BLANK" | "TRANSLATION";

export type GeneratedQ = {
  question: string;
  correctAnswer: string;
  options?: unknown;
  explanation: string;
  type: InternalType;
};

export type RagE2eReporters = {
  ok: (msg: string) => void;
  warn: (msg: string) => void;
  fail: (msg: string) => void;
  log: (msg: string) => void;
};

export function internalTypeFromApi(t: string): InternalType | null {
  if (t === "mcq") return "MULTIPLE_CHOICE";
  if (t === "fill_blank") return "FILL_IN_BLANK";
  if (t === "translation") return "TRANSLATION";
  return null;
}

export function toGeneratedQ(row: ApiQuestionRow): GeneratedQ | null {
  const internal = internalTypeFromApi(row.type);
  if (!internal) return null;
  return {
    type: internal,
    question: row.question ?? "",
    correctAnswer: row.correctAnswer ?? "",
    options: row.options,
    explanation: typeof row.explanation === "string" ? row.explanation : "",
  };
}

export function validateMcq(
  q: GeneratedQ,
  qi: number,
  vocab: Set<string>,
  tally: Tally,
  r: RagE2eReporters
): void {
  const opts = q.options as McqOption[] | undefined;
  if (!Array.isArray(opts) || opts.length !== 4) {
    r.fail(`Q${qi}: expected 4 MCQ options, got ${Array.isArray(opts) ? opts.length : "none"}`);
    tally.errors++;
    return;
  }
  const correctOpts = opts.filter((o) => o.isCorrect);
  if (correctOpts.length !== 1) {
    r.fail(`Q${qi}: expected exactly 1 correct MCQ option, found ${correctOpts.length}`);
    tally.errors++;
  } else {
    r.ok(`Q${qi}: MCQ structure valid (4 options, 1 correct)`);
  }

  const optTexts = opts.map((o) => o.text);
  if (!optTexts.some((t) => hasSinhala(t))) {
    r.warn(`Q${qi}: no Sinhala in any MCQ option — may be ungrounded`);
    tally.warnings++;
  } else {
    r.ok(`Q${qi}: at least one option contains Sinhala`);
  }

  const wrong = opts.filter((o) => !o.isCorrect);
  let suspicious = 0;
  for (const o of wrong) {
    const ov = overlapPct(o.text, vocab);
    if (ov === 0 && !hasSinhala(o.text)) suspicious++;
  }
  if (suspicious === wrong.length && vocab.size > 0) {
    r.warn(
      `Q${qi}: all distractors have 0% corpus vocab overlap and no Sinhala — possible hallucinated alternatives`
    );
    tally.warnings++;
  } else if (suspicious > 0) {
    r.warn(`Q${qi}: ${suspicious} distractor(s) look weakly grounded vs corpus tokens`);
    tally.warnings++;
  }
}

export function validateFillBlank(
  q: GeneratedQ,
  qi: number,
  tally: Tally,
  r: RagE2eReporters
): void {
  const hasBlank =
    q.question.includes("___") || q.question.includes("____") || q.question.includes("…");
  if (!hasBlank) {
    r.warn(`Q${qi}: fill-in-blank may be missing a blank marker`);
  } else {
    r.ok(`Q${qi}: blank marker present`);
  }
  if (q.correctAnswer.trim().length === 0) {
    r.fail(`Q${qi}: fill-in-blank answer is empty`);
    tally.errors++;
  }
}

export function validateTranslation(
  q: GeneratedQ,
  qi: number,
  tally: Tally,
  r: RagE2eReporters
): void {
  if (q.question.trim().length === 0) {
    r.fail(`Q${qi}: translation source text is empty`);
    tally.errors++;
  } else {
    r.ok(`Q${qi}: translation source present`);
  }
  if (q.correctAnswer.trim().length === 0) {
    r.fail(`Q${qi}: translation target is empty`);
    tally.errors++;
  }
}

export function reportGrounding(
  q: GeneratedQ,
  qi: number,
  vocab: Set<string>,
  tally: Tally,
  r: RagE2eReporters
): void {
  const combined = `${q.question} ${q.correctAnswer}`;
  const ov = overlapPct(combined, vocab);
  const anchors = anchorHitsInText(combined);
  if (ov >= 0) {
    r.log(`         vocab overlap (stem + answer): ${ov}%`);
  }
  if (anchors.length > 0) {
    r.ok(`Q${qi}: references course-like anchors: ${anchors.join(", ")}`);
  } else if (ov >= 0 && ov < 10 && vocab.size > 0) {
    r.warn(`Q${qi}: low vocab overlap (${ov}%) — question may drift from retrieved lesson text`);
    tally.warnings++;
  }
}

export async function postQuizGenerate(
  baseUrl: string,
  cookie: string
): Promise<{ durationMs: number; status: number; body: unknown }> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/quiz/generate`;
  const started = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      topic: RAG_E2E_TOPIC,
      difficulty: RAG_E2E_DIFFICULTY,
      questionCount: RAG_E2E_API_QUESTION_COUNT,
      questionTypes: [...RAG_E2E_API_TYPES],
    }),
  });
  const durationMs = Date.now() - started;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { durationMs, status: res.status, body };
}
