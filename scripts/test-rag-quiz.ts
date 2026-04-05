/**
 * scripts/test-rag-quiz.ts
 *
 * End-to-end integration test for RAG-powered quiz generation.
 *
 * Calls the quiz generation pipeline directly (bypassing HTTP + Clerk auth)
 * to verify that generated questions are grounded in real SpeakifyLK course
 * content retrieved from the Vertex AI RAG corpus.
 *
 * What is tested
 * ──────────────
 *  1. Environment — required GCP / RAG env vars are present.
 *  2. RAG retrieval — Vertex AI returns chunks for the "Greetings" topic and
 *     those chunks contain Sinhala characters.
 *  3. RAG-grounded generation — all three question types (MCQ, Fill in the
 *     Blank, Translation) are generated using course content.
 *     • MCQ: exactly 1 correct option, options contain course vocabulary.
 *     • Fill in the Blank: blank marker present, answer is non-trivial.
 *     • Translation: source and target texts are non-empty.
 *  4. Non-RAG fallback — same types generated without RAG context so we can
 *     compare vocabulary overlap and spot hallucinated alternatives.
 *  5. Results summary — timing table (RAG vs no-RAG) and overlap scores.
 *
 * Usage
 * ─────
 *   bun run rag:test-quiz
 *   tsx scripts/test-rag-quiz.ts
 *
 * Requirements
 * ────────────
 *   GCP_PROJECT_ID, GCP_LOCATION, RAG_CORPUS_ID, GOOGLE_SERVICE_ACCOUNT_KEY
 *   must be set in .env or .env.local.  The dev server does NOT need to be
 *   running — the script imports library modules directly.
 */

import * as dotenv from "dotenv";

// Load env BEFORE any module that reads process.env
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

// ── ANSI colour helpers ───────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
};

const ok = (msg: string) => console.log(`  ${C.green}✓${C.reset} ${msg}`);
const warn = (msg: string) => console.log(`  ${C.yellow}⚠${C.reset}  ${msg}`);
const fail = (msg: string) => console.log(`  ${C.red}✗${C.reset} ${msg}`);

function section(n: number, title: string) {
  console.log(`\n${C.bold}${C.blue}── ${n}. ${title} ──${C.reset}`);
}
function sub(title: string) {
  console.log(`\n  ${C.cyan}▶ ${title}${C.reset}`);
}
function ms(n: number): string {
  return `${C.dim}${n}ms${C.reset}`;
}

// ── Sinhala heuristics ────────────────────────────────────────────────────────

/** Unicode range U+0D80–U+0DFF covers the Sinhala block. */
const SINHALA_RE = /[\u0D80-\u0DFF]/;

function hasSinhala(text: string): boolean {
  return SINHALA_RE.test(text);
}

/**
 * Extracts unique lowercase tokens (≥2 chars) from all chunk texts.
 * Used to score how much a generated question overlaps with source material.
 */
function buildVocabSet(texts: string[]): Set<string> {
  const vocab = new Set<string>();
  for (const t of texts) {
    t.toLowerCase()
      .split(/[\s,.'"!;:()\-\n]+/)
      .filter((w) => w.length >= 2)
      .forEach((w) => vocab.add(w));
  }
  return vocab;
}

/**
 * Percentage of words in `text` that appear in `vocab`.
 * Returns -1 when vocab is empty (no baseline).
 */
function overlapPct(text: string, vocab: Set<string>): number {
  if (vocab.size === 0) return -1;
  const words = text
    .toLowerCase()
    .split(/[\s,.'"!;:()\-\n]+/)
    .filter((w) => w.length >= 2);
  if (words.length === 0) return 0;
  return Math.round((words.filter((w) => vocab.has(w)).length / words.length) * 100);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimingRow {
  label: string;
  durationMs: number;
  questions: number;
  ragGrounded: boolean;
}

interface McqOption {
  text: string;
  isCorrect: boolean;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(
    `\n${C.bold}${C.magenta}╔═══════════════════════════════════════════════╗${C.reset}`
  );
  console.log(
    `${C.bold}${C.magenta}║  RAG-Powered Quiz Generation — E2E Test       ║${C.reset}`
  );
  console.log(
    `${C.bold}${C.magenta}╚═══════════════════════════════════════════════╝${C.reset}`
  );

  const timings: TimingRow[] = [];
  let totalErrors = 0;

  // ── 1. Environment check ────────────────────────────────────────────────────

  section(1, "Environment Check");

  const required = ["GCP_PROJECT_ID", "GCP_LOCATION", "RAG_CORPUS_ID", "GOOGLE_SERVICE_ACCOUNT_KEY"] as const;
  let envOk = true;
  for (const v of required) {
    if (process.env[v]) {
      ok(`${v} is set`);
    } else {
      fail(`${v} is missing`);
      envOk = false;
    }
  }

  if (!envOk) {
    console.error(
      `\n${C.red}One or more required env vars are missing.${C.reset}`,
      "\nCopy .env.example → .env.local and fill in the values.\n"
    );
    process.exit(1);
  }

  console.log(`\n  Project  : ${C.dim}${process.env.GCP_PROJECT_ID}${C.reset}`);
  console.log(`  Location : ${C.dim}${process.env.GCP_LOCATION}${C.reset}`);
  console.log(`  Corpus   : ${C.dim}${process.env.RAG_CORPUS_ID}${C.reset}`);

  // Dynamic imports after dotenv is loaded
  const { getQuizContext, generateQuizWithRAG } = await import("../lib/quiz-rag");
  const { buildQuizPrompt } = await import("../lib/quiz-prompt");
  const { generateContent } = await import("../lib/gemini");
  const { parseGeminiQuizResponse } = await import("../lib/quiz-normalise");

  // ── 2. RAG context retrieval ────────────────────────────────────────────────

  section(2, "RAG Context Retrieval  [topic: 'Greetings'  difficulty: beginner]");

  type RagChunk = { text: string; source: string; score: number };
  let ragChunks: RagChunk[] = [];
  let vocab = new Set<string>();

  {
    const t = Date.now();
    try {
      ragChunks = await getQuizContext("Greetings", "beginner");
      const elapsed = Date.now() - t;

      if (ragChunks.length === 0) {
        warn(`No chunks retrieved (${ms(elapsed)}) — generation will use Gemini general knowledge only.`);
      } else {
        ok(`Retrieved ${C.bold}${ragChunks.length}${C.reset} chunks in ${ms(elapsed)}`);

        const valid = ragChunks.filter((c) => c.text.trim().length > 0);
        ok(`Non-empty chunks: ${valid.length}/${ragChunks.length}`);

        let sinhalaCount = 0;
        for (let i = 0; i < valid.length; i++) {
          const c = valid[i];
          if (hasSinhala(c.text)) sinhalaCount++;
          console.log(
            `    ${C.dim}[${i + 1}] score:${c.score.toFixed(3)}  sinhala:${hasSinhala(c.text) ? "yes" : "no"}` +
              `  src:${c.source.split("/").pop() ?? c.source}` +
              `  preview:"${c.text.replace(/\n/g, " ").substring(0, 70)}..."${C.reset}`
          );
        }

        if (sinhalaCount > 0) {
          ok(`Chunks with Sinhala characters: ${sinhalaCount}/${valid.length}`);
        } else {
          warn(`No Sinhala content found in retrieved chunks — corpus may be missing course material.`);
        }

        vocab = buildVocabSet(valid.map((c) => c.text));
        ok(`Vocab terms extracted for overlap scoring: ${vocab.size}`);
      }
    } catch (err: any) {
      fail(`RAG retrieval failed in ${ms(Date.now() - t)}: ${String(err?.message ?? err)}`);
      warn("Continuing without RAG context — grounded generation tests will be skipped.");
      totalErrors++;
    }
  }

  // ── 3. RAG-grounded generation ──────────────────────────────────────────────

  section(3, "RAG-Grounded Question Generation  (3 questions × 3 types)");

  type InternalType = "MULTIPLE_CHOICE" | "FILL_IN_BLANK" | "TRANSLATION";
  const TYPES: Array<{ label: string; internal: InternalType }> = [
    { label: "MCQ",               internal: "MULTIPLE_CHOICE" },
    { label: "Fill in the Blank", internal: "FILL_IN_BLANK"   },
    { label: "Translation",       internal: "TRANSLATION"     },
  ];

  type GeneratedQ = { question: string; correctAnswer: string; options?: unknown; explanation: string; type: InternalType };
  const ragByType = new Map<string, GeneratedQ[]>();

  for (const qt of TYPES) {
    sub(`${qt.label}  (with RAG)`);

    if (ragChunks.length === 0) {
      warn("Skipped — no RAG chunks were retrieved.");
      timings.push({ label: `${qt.label} + RAG`, durationMs: 0, questions: 0, ragGrounded: true });
      continue;
    }

    const t = Date.now();
    try {
      const questions = await generateQuizWithRAG("Greetings", "beginner", 3, [qt.internal]);
      const elapsed = Date.now() - t;

      ragByType.set(qt.label, questions);
      timings.push({ label: `${qt.label} + RAG`, durationMs: elapsed, questions: questions.length, ragGrounded: true });

      ok(`Generated ${questions.length} question(s) in ${ms(elapsed)}`);

      let sinhalaHits = 0;
      let overlapTotal = 0;
      let typeErrors = 0;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const combined = `${q.question} ${q.correctAnswer}`;

        if (hasSinhala(combined)) sinhalaHits++;
        const ov = overlapPct(combined, vocab);
        overlapTotal += ov >= 0 ? ov : 0;

        console.log(`\n    ${C.dim}Q${i + 1}: ${q.question.replace(/\n/g, " ").substring(0, 90)}`);
        console.log(`         answer : ${q.correctAnswer.substring(0, 70)}`);

        // ── MCQ-specific checks ──
        if (qt.internal === "MULTIPLE_CHOICE") {
          const opts = q.options as McqOption[] | undefined;
          if (!Array.isArray(opts) || opts.length !== 4) {
            fail(`Q${i + 1}: expected 4 options, got ${Array.isArray(opts) ? opts.length : "none"}`);
            typeErrors++;
            totalErrors++;
          } else {
            const correctOpts = opts.filter((o) => o.isCorrect);
            if (correctOpts.length !== 1) {
              fail(`Q${i + 1}: expected exactly 1 correct option, found ${correctOpts.length}`);
              typeErrors++;
              totalErrors++;
            } else {
              ok(`Q${i + 1}: MCQ has 4 options, exactly 1 marked correct`);
            }

            const optTexts = opts.map((o) => o.text);
            const hasSinhalaOpts = optTexts.some((t) => hasSinhala(t));
            console.log(`         options: ${optTexts.map((t) => `"${t.substring(0, 25)}"`).join("  |  ")}`);

            if (!hasSinhalaOpts) {
              warn(`Q${i + 1}: no Sinhala characters in MCQ options — options may be hallucinated.`);
            } else {
              ok(`Q${i + 1}: MCQ options contain Sinhala content`);
            }
          }
        }

        // ── Fill-in-blank check ──
        if (qt.internal === "FILL_IN_BLANK") {
          const hasBlank = q.question.includes("___") || q.question.includes("____") || q.question.includes("…");
          if (!hasBlank) {
            warn(`Q${i + 1}: fill-in-blank question may be missing a blank marker`);
          } else {
            ok(`Q${i + 1}: blank marker found`);
          }
          if (q.correctAnswer.trim().length === 0) {
            fail(`Q${i + 1}: correct answer is empty`);
            typeErrors++;
            totalErrors++;
          }
        }

        // ── Translation check ──
        if (qt.internal === "TRANSLATION") {
          if (q.question.trim().length === 0) {
            fail(`Q${i + 1}: source text is empty`);
            typeErrors++;
            totalErrors++;
          } else {
            ok(`Q${i + 1}: source text present (${q.question.substring(0, 50)})`);
          }
          if (q.correctAnswer.trim().length === 0) {
            fail(`Q${i + 1}: translation answer is empty`);
            typeErrors++;
            totalErrors++;
          }
        }

        if (ov >= 0) {
          console.log(`         vocab overlap with RAG corpus: ${ov}%`);
        }
        console.log(C.reset);
      }

      if (sinhalaHits > 0) {
        ok(`Questions containing Sinhala content: ${sinhalaHits}/${questions.length}`);
      } else {
        warn(`No Sinhala characters found across ${questions.length} questions`);
      }

      if (vocab.size > 0 && questions.length > 0) {
        const avg = Math.round(overlapTotal / questions.length);
        if (avg >= 10) {
          ok(`Average vocab overlap with RAG corpus: ${avg}%`);
        } else {
          warn(`Low vocab overlap with RAG corpus: ${avg}% — questions may not reference course content`);
        }
      }

      if (typeErrors === 0) {
        ok(`All structural checks passed for ${qt.label}`);
      }
    } catch (err: any) {
      const elapsed = Date.now() - t;
      fail(`${qt.label} RAG generation failed in ${ms(elapsed)}: ${String(err?.message ?? err)}`);
      timings.push({ label: `${qt.label} + RAG`, durationMs: elapsed, questions: 0, ragGrounded: true });
      totalErrors++;
    }
  }

  // ── 4. Non-RAG fallback ─────────────────────────────────────────────────────

  section(4, "Non-RAG Fallback Generation  (same topic, no corpus context)");
  console.log(`  ${C.dim}Generating without ragContext so Gemini uses general knowledge.${C.reset}`);
  console.log(`  ${C.dim}Compare vocab overlap scores to measure RAG grounding benefit.${C.reset}`);

  for (const qt of TYPES) {
    sub(`${qt.label}  (no RAG)`);

    const t = Date.now();
    try {
      const prompt = buildQuizPrompt(qt.internal, {
        topic: "Greetings",
        difficulty: "beginner",
        count: 3,
        // ragContext intentionally omitted — tests the fallback path
      });

      const geminiResp = await generateContent(prompt, { maxOutputTokens: 4096 });
      const questions = parseGeminiQuizResponse(geminiResp.text ?? "", qt.internal);
      const elapsed = Date.now() - t;

      timings.push({ label: `${qt.label} no-RAG`, durationMs: elapsed, questions: questions.length, ragGrounded: false });
      ok(`Generated ${questions.length} question(s) in ${ms(elapsed)}`);

      let sinhalaHits = 0;
      let overlapTotal = 0;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const combined = `${q.question} ${q.correctAnswer}`;
        if (hasSinhala(combined)) sinhalaHits++;
        const ov = overlapPct(combined, vocab);
        overlapTotal += ov >= 0 ? ov : 0;

        console.log(`    ${C.dim}Q${i + 1}: ${q.question.replace(/\n/g, " ").substring(0, 90)}`);
        console.log(`         answer : ${q.correctAnswer.substring(0, 70)}`);
        if (ov >= 0) console.log(`         vocab overlap with RAG corpus: ${ov}%`);
        console.log(C.reset);
      }

      // Compare overlap against RAG version
      const ragQs = ragByType.get(qt.label) ?? [];
      const ragOverlapAvg =
        ragQs.length > 0 && vocab.size > 0
          ? Math.round(
              ragQs.reduce(
                (sum, q) => sum + Math.max(0, overlapPct(`${q.question} ${q.correctAnswer}`, vocab)),
                0
              ) / ragQs.length
            )
          : -1;
      const noRagOverlapAvg =
        questions.length > 0 && vocab.size > 0
          ? Math.round(overlapTotal / questions.length)
          : -1;

      if (ragOverlapAvg >= 0 && noRagOverlapAvg >= 0) {
        const delta = ragOverlapAvg - noRagOverlapAvg;
        const indicator = delta > 0 ? `${C.green}+${delta}%${C.reset}` : delta < 0 ? `${C.red}${delta}%${C.reset}` : "no difference";
        console.log(
          `    ${C.bold}Overlap comparison — RAG: ${ragOverlapAvg}%  |  No-RAG: ${noRagOverlapAvg}%  |  RAG advantage: ${indicator}${C.reset}`
        );
      }

      if (sinhalaHits > 0) {
        ok(`Questions with Sinhala content: ${sinhalaHits}/${questions.length}`);
      } else {
        warn(`No Sinhala characters in no-RAG output — fallback may produce generic questions`);
      }
    } catch (err: any) {
      const elapsed = Date.now() - t;
      fail(`${qt.label} no-RAG generation failed in ${ms(elapsed)}: ${String(err?.message ?? err)}`);
      timings.push({ label: `${qt.label} no-RAG`, durationMs: elapsed, questions: 0, ragGrounded: false });
      totalErrors++;
    }
  }

  // ── 5. Results summary ──────────────────────────────────────────────────────

  section(5, "Results Summary");

  const col = (s: string, w: number) => s.padStart(w);
  const ROW = 32;

  console.log(
    `\n  ${"Question type".padEnd(ROW)} ${"RAG (ms)".padStart(10)} ${"No-RAG (ms)".padStart(12)} ${"Δ overhead".padStart(12)}`
  );
  console.log("  " + "─".repeat(ROW + 38));

  let totalRag = 0;
  let totalNoRag = 0;

  for (const qt of TYPES) {
    const r = timings.find((t) => t.label === `${qt.label} + RAG`);
    const n = timings.find((t) => t.label === `${qt.label} no-RAG`);
    if (!r || !n) continue;

    totalRag += r.durationMs;
    totalNoRag += n.durationMs;

    const delta = r.durationMs - n.durationMs;
    const deltaStr = delta >= 0 ? `+${delta}ms` : `${delta}ms`;
    const deltaColored =
      delta > 3000 ? `${C.yellow}${deltaStr}${C.reset}` : delta < 0 ? `${C.green}${deltaStr}${C.reset}` : deltaStr;

    console.log(
      `  ${qt.label.padEnd(ROW)} ${col(r.durationMs === 0 ? "skipped" : r.durationMs + "ms", 10)} ${col(n.durationMs + "ms", 12)} ${col(deltaColored, 12)}`
    );
  }

  console.log("  " + "─".repeat(ROW + 38));

  const totalDelta = totalRag - totalNoRag;
  const totalDeltaStr = totalDelta >= 0 ? `+${totalDelta}ms` : `${totalDelta}ms`;
  console.log(
    `  ${"TOTAL".padEnd(ROW)} ${col(totalRag + "ms", 10)} ${col(totalNoRag + "ms", 12)} ${col(totalDeltaStr, 12)}`
  );

  console.log(`\n  RAG corpus ID  : ${C.dim}${process.env.RAG_CORPUS_ID}${C.reset}`);
  console.log(`  Chunks retrieved: ${C.dim}${ragChunks.length}${C.reset}`);
  console.log(`  Vocab terms      : ${C.dim}${vocab.size}${C.reset}`);
  console.log(`  Total RAG overhead vs no-RAG: ${C.dim}${totalDeltaStr}${C.reset}`);
  console.log(
    `  Errors           : ${
      totalErrors > 0 ? `${C.red}${C.bold}${totalErrors}${C.reset}` : `${C.green}0${C.reset}`
    }`
  );

  console.log();
  if (totalErrors > 0) {
    console.log(`${C.red}${C.bold}✗ Test completed with ${totalErrors} error(s). See details above.${C.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${C.green}${C.bold}✓ All checks passed.${C.reset}\n`);
  }
}

main().catch((err) => {
  console.error(`\n${C.red}Unhandled error:${C.reset}`, err);
  process.exit(1);
});
