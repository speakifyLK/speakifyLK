import path from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

export async function test() {
  const { retrieveContext } = await import("../lib/vertex-rag");
  console.log("Searching RAG Corpus...");
  const chunks = await retrieveContext("පොත");
  console.log("Found Chunks:");
  chunks.forEach((c: any, i: number) => {
    console.log(`\n--- Result ${i + 1} (Score: ${c.score.toFixed(2)}) ---`);
    console.log(`Source: ${c.source}`);
    console.log(`Text: ${c.text}`);
  });
}

/** Exported for tests (CLI entry detection). */
export function isExecutedAsCli(): boolean {
  const runPath = process.argv[1];
  if (!runPath) return false;
  try {
    return (
      path.resolve(runPath) === path.resolve(fileURLToPath(import.meta.url))
    );
  } catch {
    /* v8 ignore next -- only reachable if import.meta.url is not a file:// URL */
    return false;
  }
}

/* v8 ignore start -- CLI entry point; only runs when executed directly */
if (isExecutedAsCli()) {
  test().catch(console.error);
}
/* v8 ignore stop */
