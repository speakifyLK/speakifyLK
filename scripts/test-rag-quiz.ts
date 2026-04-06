/**
 * scripts/test-rag-quiz.ts
 *
 * End-to-end test for RAG-powered quiz generation against real SpeakifyLK course
 * content in the Vertex AI corpus.
 *
 * What is verified
 * ────────────────
 *  1. Environment — GCP / RAG (and Gemini for generation paths).
 *  2. RAG retrieval — chunks for topic "Greetings" (Unit 1) include Sinhala text.
 *  3. Question quality — generated items overlap retrieved vocabulary; MCQ
 *     distractors are flagged when they share no tokens with the corpus and
 *     contain no Sinhala (likely hallucinated).
 *  4. All three types — MCQ, fill-in-the-blank, translation (via HTTP and/or
 *     direct library calls).
 *  5. Non-RAG fallback — same types without ragContext (mirrors API fallback
 *     when retrieval is empty or QUIZ_DISABLE_RAG=1); overlap and timing vs RAG.
 *
 * HTTP E2E (optional)
 * ───────────────────
 *  Set QUIZ_E2E_BASE_URL (e.g. http://localhost:3000) and QUIZ_E2E_COOKIE to a
 *  valid Clerk session Cookie header while logged in with an active course.
 *  The script POSTs /api/quiz/generate with topic "Greetings", beginner, and
 *  nine questions split across mcq, fill_blank, and translation.
 *
 *  Optional: run a second dev server with QUIZ_DISABLE_RAG=1 and set
 *  QUIZ_E2E_NO_RAG_BASE_URL to compare HTTP timings without RAG.
 *
 * Usage
 * ─────
 *   bun run rag:test-quiz
 *   tsx scripts/test-rag-quiz.ts
 *
 * Requirements
 * ────────────
 *   GCP_PROJECT_ID, GCP_LOCATION, RAG_CORPUS_ID, GOOGLE_SERVICE_ACCOUNT_KEY,
 *   GEMINI_MODEL (and GEMINI_API_KEY if not using SA for Gemini).
 */

import * as dotenv from "dotenv";

import {
  RAG_E2E_TOPIC as TOPIC,
  RAG_E2E_DIFFICULTY as DIFFICULTY,
  RAG_E2E_API_QUESTION_COUNT as API_QUESTION_COUNT,
  hasSinhala,
  buildVocabSet,
  overlapPct,
  postQuizGenerate,
  toGeneratedQ,
  validateMcq,
  validateFillBlank,
  validateTranslation,
  reportGrounding,
  type GeneratedQ,
  type InternalType,
  type ApiQuestionRow,
  type Tally,
  type RagE2eReporters,
} from "../lib/rag-quiz-e2e-helpers";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

// ── ANSI ──────────────────────────────────────────────────────────────────────

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

// ── Types (runner-local) ─────────────────────────────────────────────────────

interface TimingRow {
  label: string;
  durationMs: number;
  questions: number;
  ragGrounded: boolean;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runRagQuizE2eMain() {
  console.log(`\n${C.bold}${C.magenta}╔═══════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.magenta}║  RAG-Powered Quiz Generation — E2E Test       ║${C.reset}`);
  console.log(`${C.bold}${C.magenta}╚═══════════════════════════════════════════════╝${C.reset}`);

  const timings: TimingRow[] = [];
  const tally: Tally = { errors: 0, warnings: 0 };
  const reporters: RagE2eReporters = {
    ok,
    warn,
    fail,
    log: (msg: string) => console.log(msg),
  };

  section(1, "Environment Check");

  const required = [
    "GCP_PROJECT_ID",
    "GCP_LOCATION",
    "RAG_CORPUS_ID",
    "GOOGLE_SERVICE_ACCOUNT_KEY",
    "GEMINI_MODEL",
  ] as const;
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

  const e2eBase = process.env.QUIZ_E2E_BASE_URL?.trim();
  const e2eCookie = process.env.QUIZ_E2E_COOKIE?.trim();
  const e2eNoRagBase = process.env.QUIZ_E2E_NO_RAG_BASE_URL?.trim();

  const { getQuizContext, generateQuizWithRAG } = await import("../lib/quiz-rag");
  const { buildQuizPrompt } = await import("../lib/quiz-prompt");
  const { generateContent } = await import("../lib/gemini");
  const { parseGeminiQuizResponse } = await import("../lib/quiz-normalise");

  // ── 2. RAG retrieval ──────────────────────────────────────────────────────

  section(2, `RAG context  [topic: '${TOPIC}'  difficulty: ${DIFFICULTY}]`);

  type RagChunk = { text: string; source: string; score: number };
  let ragChunks: RagChunk[] = [];
  let vocab = new Set<string>();

  {
    const t = Date.now();
    try {
      ragChunks = await getQuizContext(TOPIC, DIFFICULTY);
      const elapsed = Date.now() - t;

      if (ragChunks.length === 0) {
        warn(`No chunks retrieved (${ms(elapsed)}) — generation will not be RAG-grounded.`);
      } else {
        ok(`Retrieved ${C.bold}${ragChunks.length}${C.reset} chunks in ${ms(elapsed)}`);

        const valid = ragChunks.filter((c) => c.text.trim().length > 0);
        let sinhalaCount = 0;
        for (let i = 0; i < valid.length; i++) {
          const c = valid[i];
          if (hasSinhala(c.text)) sinhalaCount++;
          const srcLeaf = c.source.split("/").pop();
          console.log(
            `    ${C.dim}[${i + 1}] score:${c.score.toFixed(3)}  sinhala:${hasSinhala(c.text) ? "yes" : "no"} ` +
              ` src:${srcLeaf && srcLeaf.length > 0 ? srcLeaf : c.source} ` +
              ` preview:"${c.text.replace(/\n/g, " ").substring(0, 70)}..."${C.reset}`
          );
        }

        if (sinhalaCount > 0) {
          ok(`Chunks with Sinhala: ${sinhalaCount}/${valid.length}`);
        } else {
          warn(`No Sinhala in retrieved chunks — corpus may be missing course material.`);
        }

        vocab = buildVocabSet(valid.map((c) => c.text));
        ok(`Vocab terms for overlap scoring: ${vocab.size}`);
      }
    } catch (err: unknown) {
      fail(
        `RAG retrieval failed in ${ms(Date.now() - t)}: ${String((err as Error)?.message ?? err)}`
      );
      warn("Continuing — grounded checks may be limited.");
      tally.errors++;
    }
  }

  const ragByType = new Map<string, GeneratedQ[]>();
  let usedHttpPrimary = false;

  // ── 3a. HTTP → /api/quiz/generate (optional) ────────────────────────────────

  if (e2eBase && e2eCookie) {
    usedHttpPrimary = true;
    section(3, `HTTP E2E — POST /api/quiz/generate  (${API_QUESTION_COUNT} questions, all types)`);

    sub("Authenticated request (RAG enabled on server)");
    try {
      const { durationMs, status, body } = await postQuizGenerate(e2eBase, e2eCookie);
      timings.push({
        label: "HTTP + RAG",
        durationMs,
        questions: 0,
        ragGrounded: true,
      });

      if (status !== 200) {
        fail(`HTTP ${status} in ${ms(durationMs)} — ${JSON.stringify(body).substring(0, 200)}`);
        tally.errors++;
      } else {
        ok(`HTTP 200 in ${ms(durationMs)}`);
        const rec = body as { questions?: ApiQuestionRow[] };
        const rows = Array.isArray(rec.questions) ? rec.questions : [];
        timings[timings.length - 1].questions = rows.length;

        if (rows.length !== API_QUESTION_COUNT) {
          fail(`Expected ${API_QUESTION_COUNT} questions, got ${rows.length}`);
          tally.errors++;
        }

        const byType: Record<string, GeneratedQ[]> = { MCQ: [], FILL: [], TR: [] };
        for (let i = 0; i < rows.length; i++) {
          const g = toGeneratedQ(rows[i]);
          if (!g) {
            fail(`Row ${i + 1}: unknown type ${JSON.stringify(rows[i]?.type)}`);
            tally.errors++;
            continue;
          }
          if (g.type === "MULTIPLE_CHOICE") byType.MCQ.push(g);
          else if (g.type === "FILL_IN_BLANK") byType.FILL.push(g);
          else byType.TR.push(g);
        }

        for (const label of ["MCQ", "FILL", "TR"] as const) {
          const list = byType[label];
          const exp = API_QUESTION_COUNT / 3;
          if (list.length !== exp) {
            fail(`${label}: expected ${exp} questions, got ${list.length}`);
            tally.errors++;
          }
        }

        let idx = 0;
        for (const g of [...byType.MCQ, ...byType.FILL, ...byType.TR]) {
          idx++;
          console.log(
            `\n    ${C.dim}Q${idx} [${g.type}]: ${g.question.replace(/\n/g, " ").substring(0, 88)}...`
          );
          console.log(`         answer: ${g.correctAnswer.substring(0, 72)}${C.reset}`);
          if (g.type === "MULTIPLE_CHOICE") validateMcq(g, idx, vocab, tally, reporters);
          else if (g.type === "FILL_IN_BLANK") validateFillBlank(g, idx, tally, reporters);
          else validateTranslation(g, idx, tally, reporters);
          if (vocab.size > 0) reportGrounding(g, idx, vocab, tally, reporters);
        }

        ragByType.set("MCQ", byType.MCQ);
        ragByType.set("Fill in the Blank", byType.FILL);
        ragByType.set("Translation", byType.TR);
      }
    } catch (err: unknown) {
      fail(`HTTP request failed: ${String((err as Error)?.message ?? err)}`);
      tally.errors++;
    }

    if (e2eNoRagBase && e2eCookie) {
      sub("Second server — POST without RAG (QUIZ_DISABLE_RAG=1 on that process)");
      try {
        const { durationMs, status, body } = await postQuizGenerate(e2eNoRagBase, e2eCookie);
        timings.push({
          label: "HTTP no-RAG",
          durationMs,
          questions: 0,
          ragGrounded: false,
        });

        if (status !== 200) {
          fail(
            `no-RAG HTTP ${status} in ${ms(durationMs)} — ${JSON.stringify(body).substring(0, 200)}`
          );
          tally.errors++;
        } else {
          ok(`no-RAG HTTP 200 in ${ms(durationMs)}`);
          const rec = body as { questions?: ApiQuestionRow[] };
          const rows = Array.isArray(rec.questions) ? rec.questions : [];
          timings[timings.length - 1].questions = rows.length;

          let overlapSum = 0;
          let n = 0;
          for (const row of rows) {
            const g = toGeneratedQ(row);
            if (!g || vocab.size === 0) continue;
            const ov = overlapPct(`${g.question} ${g.correctAnswer}`, vocab);
            /* v8 ignore next 3 -- with non-empty vocab, overlapPct is never -1 */
            if (ov >= 0) {
              overlapSum += ov;
              n++;
            }
          }
          if (n > 0) {
            const avg = Math.round(overlapSum / n);
            console.log(
              `    ${C.bold}Average vocab overlap vs same RAG corpus (no-RAG generation): ${avg}%${C.reset}`
            );
          }
        }
      } catch (err: unknown) {
        fail(`no-RAG HTTP failed: ${String((err as Error)?.message ?? err)}`);
        tally.errors++;
      }
    }

    if (e2eBase && e2eCookie && !e2eNoRagBase) {
      console.log(
        `  ${C.dim}Tip: set QUIZ_E2E_NO_RAG_BASE_URL to a server started with QUIZ_DISABLE_RAG=1 for HTTP no-RAG timings.${C.reset}`
      );
    }
  } else {
    section(3, "Skipping HTTP E2E");
    console.log(
      `  ${C.dim}Set QUIZ_E2E_BASE_URL and QUIZ_E2E_COOKIE to call /api/quiz/generate from this script.${C.reset}`
    );
  }

  // ── 3b. Library RAG generation (when HTTP path not used) ─────────────────

  if (!usedHttpPrimary) {
    section(3, "RAG-grounded generation (library) — one batch per question type");

    const TYPES: Array<{ label: string; internal: InternalType }> = [
      { label: "MCQ", internal: "MULTIPLE_CHOICE" },
      { label: "Fill in the Blank", internal: "FILL_IN_BLANK" },
      { label: "Translation", internal: "TRANSLATION" },
    ];

    for (const qt of TYPES) {
      sub(`${qt.label}  (with RAG)`);

      if (ragChunks.length === 0) {
        warn("Skipped — no RAG chunks were retrieved.");
        timings.push({
          label: `${qt.label} + RAG`,
          durationMs: 0,
          questions: 0,
          ragGrounded: true,
        });
        continue;
      }

      const t = Date.now();
      try {
        const questions = await generateQuizWithRAG(TOPIC, DIFFICULTY, 3, [qt.internal]);
        const elapsed = Date.now() - t;

        ragByType.set(qt.label, questions);
        timings.push({
          label: `${qt.label} + RAG`,
          durationMs: elapsed,
          questions: questions.length,
          ragGrounded: true,
        });

        ok(`Generated ${questions.length} question(s) in ${ms(elapsed)}`);

        let sinhalaHits = 0;
        let overlapTotal = 0;

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const combined = `${q.question} ${q.correctAnswer}`;
          if (hasSinhala(combined)) sinhalaHits++;
          const ov = overlapPct(combined, vocab);
          overlapTotal += ov >= 0 ? ov : 0;

          console.log(
            `\n    ${C.dim}Q${i + 1}: ${q.question.replace(/\n/g, " ").substring(0, 90)}`
          );
          console.log(`         answer : ${q.correctAnswer.substring(0, 70)}`);

          if (qt.internal === "MULTIPLE_CHOICE") validateMcq(q, i + 1, vocab, tally, reporters);
          else if (qt.internal === "FILL_IN_BLANK") validateFillBlank(q, i + 1, tally, reporters);
          else validateTranslation(q, i + 1, tally, reporters);
          if (vocab.size > 0) reportGrounding(q, i + 1, vocab, tally, reporters);

          if (ov >= 0) console.log(`         vocab overlap with RAG corpus: ${ov}%`);
          console.log(C.reset);
        }

        if (sinhalaHits > 0) {
          ok(`Questions containing Sinhala: ${sinhalaHits}/${questions.length}`);
        } else {
          warn(`No Sinhala across ${questions.length} questions`);
          tally.warnings++;
        }

        if (vocab.size > 0 && questions.length > 0) {
          const avg = Math.round(overlapTotal / questions.length);
          if (avg >= 10) {
            ok(`Average vocab overlap with RAG corpus: ${avg}%`);
          } else {
            warn(`Low average vocab overlap: ${avg}%`);
            tally.warnings++;
          }
        }
      } catch (err: unknown) {
        const elapsed = Date.now() - t;
        fail(
          `${qt.label} RAG generation failed in ${ms(elapsed)}: ${String((err as Error)?.message ?? err)}`
        );
        timings.push({
          label: `${qt.label} + RAG`,
          durationMs: elapsed,
          questions: 0,
          ragGrounded: true,
        });
        tally.errors++;
      }
    }
  }

  // ── 4. Non-RAG fallback (library — matches API when corpus is empty) ─────

  section(4, "Non-RAG fallback (library, no ragContext in prompt)");

  const TYPES_LIB: Array<{ label: string; internal: InternalType }> = [
    { label: "MCQ", internal: "MULTIPLE_CHOICE" },
    { label: "Fill in the Blank", internal: "FILL_IN_BLANK" },
    { label: "Translation", internal: "TRANSLATION" },
  ];

  for (const qt of TYPES_LIB) {
    sub(`${qt.label}  (no RAG)`);

    const t = Date.now();
    try {
      const prompt = buildQuizPrompt(qt.internal, {
        topic: TOPIC,
        difficulty: DIFFICULTY,
        count: 3,
      });

      const geminiResp = await generateContent(prompt, { maxOutputTokens: 4096 });
      const questions = parseGeminiQuizResponse(geminiResp.text ?? "", qt.internal);
      const elapsed = Date.now() - t;

      timings.push({
        label: `${qt.label} no-RAG (lib)`,
        durationMs: elapsed,
        questions: questions.length,
        ragGrounded: false,
      });
      ok(`Generated ${questions.length} question(s) in ${ms(elapsed)}`);

      let overlapTotal = 0;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const combined = `${q.question} ${q.correctAnswer}`;
        const ov = overlapPct(combined, vocab);
        overlapTotal += ov >= 0 ? ov : 0;

        console.log(`    ${C.dim}Q${i + 1}: ${q.question.replace(/\n/g, " ").substring(0, 90)}`);
        console.log(`         answer : ${q.correctAnswer.substring(0, 70)}`);
        if (ov >= 0) console.log(`         vocab overlap with RAG corpus: ${ov}%`);
        console.log(C.reset);
      }

      const ragQs = ragByType.get(qt.label) ?? [];
      const ragOverlapAvg =
        ragQs.length > 0 && vocab.size > 0
          ? Math.round(
              ragQs.reduce(
                (sum, q) =>
                  sum + Math.max(0, overlapPct(`${q.question} ${q.correctAnswer}`, vocab)),
                0
              ) / ragQs.length
            )
          : -1;
      const noRagOverlapAvg =
        questions.length > 0 && vocab.size > 0 ? Math.round(overlapTotal / questions.length) : -1;

      if (ragOverlapAvg >= 0 && noRagOverlapAvg >= 0) {
        const delta = ragOverlapAvg - noRagOverlapAvg;
        const indicator =
          delta > 0
            ? `${C.green}+${delta}%${C.reset}`
            : delta < 0
              ? `${C.red}${delta}%${C.reset}`
              : "no difference";
        console.log(
          `    ${C.bold}Overlap — RAG: ${ragOverlapAvg}%  |  No-RAG: ${noRagOverlapAvg}%  |  Δ: ${indicator}${C.reset}`
        );
      }
    } catch (err: unknown) {
      const elapsed = Date.now() - t;
      fail(
        `${qt.label} no-RAG failed in ${ms(elapsed)}: ${String((err as Error)?.message ?? err)}`
      );
      timings.push({
        label: `${qt.label} no-RAG (lib)`,
        durationMs: elapsed,
        questions: 0,
        ragGrounded: false,
      });
      tally.errors++;
    }
  }

  // ── 5. Results summary ──────────────────────────────────────────────────────

  section(5, "Results summary (timings)");

  const httpRag = timings.find((x) => x.label === "HTTP + RAG");
  const httpNo = timings.find((x) => x.label === "HTTP no-RAG");

  if (httpRag) {
    console.log(
      `\n  ${C.bold}HTTP /api/quiz/generate${C.reset}  RAG: ${httpRag.durationMs}ms  (${httpRag.questions} questions)`
    );
    if (httpNo) {
      console.log(
        `  ${C.bold}HTTP (no-RAG server)${C.reset}: ${httpNo.durationMs}ms  (${httpNo.questions} questions)  ` +
          `${C.dim}Δ ${httpNo.durationMs - httpRag.durationMs >= 0 ? "+" : ""}${httpNo.durationMs - httpRag.durationMs}ms${C.reset}`
      );
    }
  }

  console.log(`\n  ${C.bold}Library generation (per type, ms)${C.reset}`);
  console.log(
    `  ${"Type".padEnd(22)} ${"RAG".padStart(10)} ${"No-RAG".padStart(10)} ${"Δ".padStart(10)}`
  );
  console.log("  " + "─".repeat(54));

  for (const qt of TYPES_LIB) {
    const r = timings.find((t) => t.label === `${qt.label} + RAG`);
    const n = timings.find((t) => t.label === `${qt.label} no-RAG (lib)`);
    /* v8 ignore next -- defensive guard; section 4 always records a no-RAG timing per type */
    if (!n) continue;
    const rMs = r?.durationMs ?? 0;
    const nMs = n.durationMs;
    const rStr = usedHttpPrimary
      ? "—"
      : r && r.questions > 0
        ? `${rMs}ms`
        : r && rMs === 0
          ? "skip"
          : `${rMs}ms`;
    const d = usedHttpPrimary ? nMs - nMs : rMs - nMs;
    const dStr = usedHttpPrimary ? "—" : `${d >= 0 ? "+" : ""}${d}ms`;
    console.log(
      `  ${qt.label.padEnd(22)} ${rStr.padStart(10)} ${`${nMs}ms`.padStart(10)} ${dStr.padStart(10)}`
    );
  }

  console.log(`\n  RAG corpus ID     : ${C.dim}${process.env.RAG_CORPUS_ID}${C.reset}`);
  console.log(`  Chunks retrieved  : ${C.dim}${ragChunks.length}${C.reset}`);
  console.log(`  Vocab terms       : ${C.dim}${vocab.size}${C.reset}`);
  console.log(
    `  Errors / warnings : ${
      tally.errors > 0 ? `${C.red}${tally.errors}${C.reset}` : `${C.green}0${C.reset}`
    } / ${tally.warnings > 0 ? `${C.yellow}${tally.warnings}${C.reset}` : `0`}`
  );

  console.log();
  if (tally.errors > 0) {
    console.log(`${C.red}${C.bold}✗ Finished with ${tally.errors} error(s).${C.reset}\n`);
    process.exit(1);
  }
  if (tally.warnings > 0) {
    console.log(`${C.yellow}${C.bold}✓ Completed with ${tally.warnings} warning(s).${C.reset}\n`);
  } else {
    console.log(`${C.green}${C.bold}✓ All checks passed.${C.reset}\n`);
  }
}

/* v8 ignore start -- CLI entry only; under Vitest, VITEST is always set */
if (!process.env.VITEST) {
  runRagQuizE2eMain().catch((err) => {
    console.error(`\n${C.red}Unhandled error:${C.reset}`, err);
    process.exit(1);
  });
}
/* v8 ignore stop */
