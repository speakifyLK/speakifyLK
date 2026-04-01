/**
 * RAG pipeline status — read-only diagnostic script.
 *
 * Displays the current state of the RAG pipeline:
 *   - Corpus info (display name, create time)
 *   - Number of RagFiles imported in the corpus
 *   - Number of GCS objects under the rag-content/ prefix
 *   - Sync comparison between GCS and corpus
 *
 * Required env:
 *   GCP_PROJECT_ID              — Google Cloud project ID
 *   GCP_LOCATION                — Vertex AI region (e.g. us-west1)
 *   RAG_CORPUS_ID               — Vertex AI RAG corpus ID
 *   GOOGLE_SERVICE_ACCOUNT_KEY  — GCP service account JSON key
 *
 * Optional env:
 *   RAG_CONTENT_BUCKET  — GCS bucket name (default: speakifylk-rag-content)
 *   RAG_GCS_PREFIX      — GCS prefix (default: rag-content/)
 *
 * Usage:
 *   npx tsx ./scripts/rag-status.ts
 *   npm run rag:status
 */

import * as dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

import { getAuthHeaders } from "../lib/gcp-auth";

// ── Config ───────────────────────────────────────────────────────────

function getEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

const PROJECT_ID = getEnv("GCP_PROJECT_ID");
const LOCATION = getEnv("GCP_LOCATION");
const CORPUS_ID = getEnv("RAG_CORPUS_ID");

const BASE_URL = `https://${LOCATION}-aiplatform.googleapis.com/v1`;
const CORPUS_PATH = `projects/${PROJECT_ID}/locations/${LOCATION}/ragCorpora/${CORPUS_ID}`;

function contentBucket(): string {
  return process.env.RAG_CONTENT_BUCKET?.trim() || "speakifylk-rag-content";
}

function gcsPrefix(): string {
  const p = process.env.RAG_GCS_PREFIX?.trim() || "rag-content/";
  return p.endsWith("/") ? p : `${p}/`;
}

// ── Corpus Info ──────────────────────────────────────────────────────

async function getCorpusInfo(): Promise<{
  displayName: string;
  createTime: string;
}> {
  const headers = await getAuthHeaders();
  const url = `${BASE_URL}/${CORPUS_PATH}`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get corpus info (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    displayName?: string;
    createTime?: string;
  };

  return {
    displayName: data.displayName || "(unnamed)",
    createTime: data.createTime || "unknown",
  };
}

// ── RagFiles Count ───────────────────────────────────────────────────

async function countRagFiles(): Promise<{ count: number; uris: string[] }> {
  const headers = await getAuthHeaders();
  const uris: string[] = [];
  let pageToken: string | undefined;

  do {
    const q = new URLSearchParams({ pageSize: "100" });
    if (pageToken) q.set("pageToken", pageToken);
    const url = `${BASE_URL}/${CORPUS_PATH}/ragFiles?${q}`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to list RagFiles (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      ragFiles?: Array<{ gcsSource?: { uris?: string[] } }>;
      nextPageToken?: string;
    };

    if (data.ragFiles) {
      for (const rf of data.ragFiles) {
        const fileUris = rf.gcsSource?.uris || [];
        uris.push(...fileUris);
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return { count: uris.length, uris };
}

// ── GCS Objects Count ────────────────────────────────────────────────

async function countGcsObjects(): Promise<{ count: number; uris: string[] }> {
  const headers = await getAuthHeaders();
  const bucket = contentBucket();
  const prefix = gcsPrefix();
  const uris: string[] = [];
  let pageToken: string | undefined;

  do {
    const q = new URLSearchParams({ prefix, fields: "items(name),nextPageToken" });
    if (pageToken) q.set("pageToken", pageToken);
    const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?${q}`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to list GCS objects (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      items?: Array<{ name?: string }>;
      nextPageToken?: string;
    };

    if (data.items) {
      for (const item of data.items) {
        if (item.name) uris.push(`gs://${bucket}/${item.name}`);
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return { count: uris.length, uris };
}

// ── Main ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\nRAG Pipeline Status\n");
  console.log("─".repeat(60));

  // 1. Corpus Info
  console.log("\nCorpus Info");
  try {
    const corpus = await getCorpusInfo();
    console.log(`   Display Name: ${corpus.displayName}`);
    console.log(`   Corpus ID:    ${CORPUS_ID}`);
    const created = new Date(corpus.createTime);
    console.log(
      `   Created:      ${isNaN(created.getTime()) ? corpus.createTime : created.toLocaleString()}`
    );
    console.log(`   Location:     ${LOCATION}`);
  } catch (err) {
    console.error(`Could not fetch corpus info:`, err instanceof Error ? err.message : err);
  }

  // 2. GCS Objects
  console.log("\nGCS Bucket");
  let gcsUris: string[] = [];
  let gcsFetchOk = false;
  try {
    const gcs = await countGcsObjects();
    gcsUris = gcs.uris;
    gcsFetchOk = true;
    console.log(`   Bucket:  ${contentBucket()}`);
    console.log(`   Prefix:  ${gcsPrefix()}`);
    console.log(`   Files:   ${gcs.count}`);
  } catch (err) {
    console.error(`Could not list GCS objects:`, err instanceof Error ? err.message : err);
  }

  // 3. RagFiles
  console.log("\nImported RagFiles");
  let ragUris: string[] = [];
  let ragFetchOk = false;
  try {
    const rag = await countRagFiles();
    ragUris = rag.uris;
    ragFetchOk = true;
    console.log(`   Imported: ${rag.count}`);
  } catch (err) {
    console.error(`Could not list RagFiles:`, err instanceof Error ? err.message : err);
  }

  // 4. Sync Status
  console.log("\nSync Status");
  if (!gcsFetchOk || !ragFetchOk) {
    console.log("   ⚠️  Sync status unknown — could not fetch GCS or RagFile data.");
  } else {
    const gcsSet = new Set(gcsUris);
    const ragSet = new Set(ragUris);

    const notImported = gcsUris.filter((u) => !ragSet.has(u));
    const orphaned = ragUris.filter((u) => !gcsSet.has(u));

    if (notImported.length === 0 && orphaned.length === 0) {
      console.log("GCS and corpus are fully in sync!");
    } else {
      if (notImported.length > 0) {
        console.log(`${notImported.length} GCS file(s) not yet imported:`);
        for (const uri of notImported.slice(0, 5)) {
          console.log(`      - ${uri}`);
        }
        if (notImported.length > 5) {
          console.log(`      ... and ${notImported.length - 5} more`);
        }
      }
      if (orphaned.length > 0) {
        console.log(`${orphaned.length} RagFile(s) with no matching GCS object:`);
        for (const uri of orphaned.slice(0, 5)) {
          console.log(`      - ${uri}`);
        }
        if (orphaned.length > 5) {
          console.log(`      ... and ${orphaned.length - 5} more`);
        }
      }
    }
  }

  console.log("\n" + "─".repeat(60));
  if (gcsFetchOk && ragFetchOk) {
    const notImported = gcsUris.filter((u) => !new Set(ragUris).has(u));
    const orphaned = ragUris.filter((u) => !new Set(gcsUris).has(u));
    if (notImported.length > 0) {
      console.log("   Run 'npm run rag:import:diff' to import missing files.");
    }
    if (orphaned.length > 0) {
      console.log("   Run 'npm run rag:import:force' to clean up and re-import all files.");
    }
    if (notImported.length === 0 && orphaned.length === 0) {
      console.log("   Everything is up to date — no action needed.");
    }
  }
  console.log("");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
