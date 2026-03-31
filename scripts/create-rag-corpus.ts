/**
 * Provision or inspect Vertex AI RAG corpora via the REST API.
 *
 * Required env: GCP_PROJECT_ID, GCP_LOCATION, GOOGLE_SERVICE_ACCOUNT_KEY
 *
 * Usage:
 *   npx tsx ./scripts/create-rag-corpus.ts            # Create a new corpus
 *   npx tsx ./scripts/create-rag-corpus.ts --check     # List existing corpora
 */

import * as dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

import { getAuthHeaders } from "../lib/gcp-auth";

// ── Config ───────────────────────────────────────────────────────────

const PROJECT_ID = process.env.GCP_PROJECT_ID?.trim();
const LOCATION = process.env.GCP_LOCATION?.trim();
const SERVICE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim();
const DISPLAY_NAME = "speakifylk-course-content";

const BASE_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1`;
const CORPORA_URL = `${BASE_URL}/projects/${PROJECT_ID}/locations/${LOCATION}/ragCorpora`;

const OP_POLL_INTERVAL_MS = 3000;
const OP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ── Helpers ──────────────────────────────────────────────────────────

function assertEnvVars(): void {
  const missing: string[] = [];
  if (!PROJECT_ID) missing.push("GCP_PROJECT_ID");
  if (!LOCATION) missing.push("GCP_LOCATION");
  if (!SERVICE_KEY) missing.push("GOOGLE_SERVICE_ACCOUNT_KEY");

  if (missing.length > 0) {
    console.error(
      `\n❌ Missing required environment variables:\n${missing.map((v) => `   - ${v}`).join("\n")}\n\n` +
        `Add them to your .env.local file and try again.\n`
    );
    process.exit(1);
  }
}

async function handleApiError(response: Response, action: string): Promise<never> {
  let body: string;
  try {
    body = await response.text();
  } catch {
    body = "(unable to read response body)";
  }

  console.error(`\n❌ Failed to ${action}`);
  console.error(`   Status: ${response.status} ${response.statusText}`);
  console.error(`   Response: ${body}`);

  if (response.status === 401 || response.status === 403) {
    console.error(
      "\n💡 Suggestion: Check that your service account has the " +
        '"Vertex AI User" (roles/aiplatform.user) IAM role.'
    );
  } else if (response.status === 404) {
    console.error(
      "\n💡 Suggestion: Verify GCP_PROJECT_ID and GCP_LOCATION are correct, " +
        "and that the Vertex AI API is enabled in your project."
    );
  } else if (response.status === 429) {
    console.error("\n💡 Suggestion: You are being rate-limited. Wait a moment and try again.");
  }

  process.exit(1);
}

// ── Poll long-running operation ──────────────────────────────────────

async function pollOperation(operationName: string): Promise<Record<string, unknown>> {
  const opUrl = `${BASE_URL}/${operationName}`;
  const start = Date.now();

  console.log(`\n⏳ Waiting for operation to complete...`);
  console.log(`   Operation: ${operationName}\n`);

  while (Date.now() - start < OP_TIMEOUT_MS) {
    const headers = await getAuthHeaders();
    const res = await fetch(opUrl, { headers });

    if (!res.ok) {
      await handleApiError(res, "poll operation status");
    }

    const data = (await res.json()) as Record<string, unknown>;

    if (data.done) {
      if (data.error) {
        console.error("❌ Operation completed with error:", JSON.stringify(data.error, null, 2));
        process.exit(1);
      }
      return data;
    }

    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, OP_POLL_INTERVAL_MS));
  }

  console.error("\n❌ Operation timed out after 5 minutes.");
  console.error(`   You can check its status manually:\n   GET ${opUrl}`);
  process.exit(1);
}

// ── --check: List existing corpora ───────────────────────────────────

async function listCorpora(): Promise<void> {
  console.log("\n🔍 Listing existing RAG corpora...\n");
  console.log(`   Project:  ${PROJECT_ID}`);
  console.log(`   Location: ${LOCATION}\n`);

  const headers = await getAuthHeaders();
  const res = await fetch(CORPORA_URL, { headers });

  if (!res.ok) {
    await handleApiError(res, "list RAG corpora");
  }

  const data = (await res.json()) as {
    ragCorpora?: Array<{
      name?: string;
      displayName?: string;
      createTime?: string;
    }>;
  };

  const corpora = data.ragCorpora || [];

  if (corpora.length === 0) {
    console.log("   No corpora found. Create one with:\n");
    console.log("   npm run rag:create\n");
    return;
  }

  console.log(`   Found ${corpora.length} corpus/corpora:\n`);
  console.log("   " + "-".repeat(90));
  console.log("   " + "Display Name".padEnd(35) + "Corpus ID".padEnd(25) + "Created");
  console.log("   " + "-".repeat(90));

  for (const corpus of corpora) {
    const name = corpus.name || "";
    const id = name.split("/").pop() || "?";
    const displayName = (corpus.displayName || "(unnamed)").substring(0, 33);
    const created = corpus.createTime ? new Date(corpus.createTime).toLocaleDateString() : "?";

    console.log("   " + displayName.padEnd(35) + id.padEnd(25) + created);
  }

  console.log("   " + "-".repeat(90));
  console.log(
    "\n   To use a corpus, add to .env.local:\n" + "   RAG_CORPUS_ID=<corpus-id-from-above>\n"
  );
}

// ── Default: Create a new corpus ─────────────────────────────────────

async function createCorpus(): Promise<void> {
  console.log("\n🚀 Creating RAG corpus...\n");
  console.log(`   Project:      ${PROJECT_ID}`);
  console.log(`   Location:     ${LOCATION}`);
  console.log(`   Display Name: ${DISPLAY_NAME}\n`);

  const headers = await getAuthHeaders();
  const res = await fetch(CORPORA_URL, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      displayName: DISPLAY_NAME,
    }),
  });

  if (!res.ok) {
    await handleApiError(res, "create RAG corpus");
  }

  const operationData = (await res.json()) as Record<string, unknown>;

  // The API returns a long-running operation
  const operationName = operationData.name as string | undefined;

  if (!operationName) {
    // Some API versions return the corpus directly
    const directName = (operationData as { name?: string }).name;
    if (directName && directName.includes("ragCorpora")) {
      printCorpusResult(directName);
      return;
    }

    console.error("❌ Unexpected response format:", JSON.stringify(operationData, null, 2));
    process.exit(1);
  }

  // If it's an operation, poll until complete
  if (operationName.includes("operations")) {
    const result = await pollOperation(operationName);
    const response = result.response as { name?: string } | undefined;
    const corpusName = response?.name;

    if (!corpusName) {
      console.error("❌ Operation completed but no corpus name found in response.");
      console.error("   Full response:", JSON.stringify(result, null, 2));
      process.exit(1);
    }

    printCorpusResult(corpusName);
  } else {
    // operationName IS the corpus resource name
    printCorpusResult(operationName);
  }
}

function printCorpusResult(corpusResourceName: string): void {
  const corpusId = corpusResourceName.split("/").pop() || corpusResourceName;

  console.log("\n✅ RAG corpus created successfully!\n");
  console.log(`   Resource Name: ${corpusResourceName}`);
  console.log(`   Corpus ID:     ${corpusId}`);

  console.log("\n   ┌─────────────────────────────────────────────┐");
  console.log(`   │  Add this to your .env.local:               │`);
  console.log(`   │                                             │`);
  console.log(`   │  RAG_CORPUS_ID=${corpusId.padEnd(28)}│`);
  console.log("   └─────────────────────────────────────────────┘");

  console.log("\n   After adding, you can import content with:\n" + "   npm run rag:import\n");
}

// ── Main ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  assertEnvVars();

  const args = process.argv.slice(2);

  if (args.includes("--check")) {
    await listCorpora();
  } else {
    await createCorpus();
  }
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
