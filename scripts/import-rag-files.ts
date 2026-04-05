/**
 * Import RAG content from GCS into a Vertex AI RAG corpus.
 *
 * Required env: GCP_PROJECT_ID, GCP_LOCATION, RAG_CORPUS_ID, GOOGLE_SERVICE_ACCOUNT_KEY
 * Optional env: RAG_CONTENT_BUCKET (default: speakifylk-rag-content), RAG_GCS_PREFIX (default: rag-content/)
 *
 * Usage:
 *   npx tsx ./scripts/import-rag-files.ts
 *   npx tsx ./scripts/import-rag-files.ts --diff
 *   npx tsx ./scripts/import-rag-files.ts --force
 *   npx tsx ./scripts/import-rag-files.ts --status
 */

import * as dotenv from "dotenv";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();
dotenv.config({ path: ".env.local", override: true });

import { getAuthHeaders } from "../lib/gcp-auth";
import {
  printRagStatus as printRagStatusReport,
  type RagFileStatus,
} from "../lib/rag-import-status";

const MANIFEST_FILENAME = path.join("tmp", ".rag-import-manifest.json");
const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 100;
const IMPORT_BATCH_SIZE = 20;
const OP_POLL_MS = 4000;
const DEFAULT_OP_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

type GcsObjectMeta = { gsUri: string; md5Hash: string };
type ManifestFileEntry = { md5: string; lastImportedAt: string };
type ImportManifest = {
  version: 1;
  /** ISO timestamp — last time the manifest was written after a successful run */
  updatedAt: string;
  files: Record<string, ManifestFileEntry>;
};

function getOpTimeoutMs(): number {
  const raw = process.env.RAG_OP_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_OP_TIMEOUT_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_OP_TIMEOUT_MS;
  return n;
}

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v.trim();
}

function getAiplatformBase(): string {
  const loc = getEnv("GCP_LOCATION");
  return `https://${loc}-aiplatform.googleapis.com/v1`;
}

function corpusParent(): string {
  const project = getEnv("GCP_PROJECT_ID");
  const location = getEnv("GCP_LOCATION");
  const corpusId = getEnv("RAG_CORPUS_ID");
  return `projects/${project}/locations/${location}/ragCorpora/${corpusId}`;
}

function contentBucket(): string {
  return process.env.RAG_CONTENT_BUCKET?.trim() || "speakifylk-rag-content";
}

function gcsPrefix(): string {
  const p = process.env.RAG_GCS_PREFIX?.trim() || "rag-content/";
  return p.endsWith("/") ? p : `${p}/`;
}

function parseFlags(argv: string[]): {
  force: boolean;
  diff: boolean;
  status: boolean;
} {
  return {
    force: argv.includes("--force"),
    diff: argv.includes("--diff"),
    status: argv.includes("--status"),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = {
    ...(await getAuthHeaders()),
    ...(init?.headers as Record<string, string>),
  };
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Non-JSON response ${res.status} from ${url}: ${text.slice(0, 500)}`);
  }
  if (!res.ok) {
    throw new Error(
      `${init?.method ?? "GET"} ${url} -> ${res.status}: ${typeof body === "object" ? JSON.stringify(body) : text}`
    );
  }
  return body as T;
}

async function waitForOperation(operationName: string): Promise<void> {
  const base = getAiplatformBase();
  const url = `${base}/${operationName}`;
  const startedAt = Date.now();
  const timeoutMs = getOpTimeoutMs();
  for (;;) {
    const elapsed = Date.now() - startedAt;
    if (elapsed > timeoutMs) {
      throw new Error(
        `Timed out waiting for operation after ${Math.ceil(timeoutMs / 1000)}s: ${operationName}`
      );
    }

    const op = await fetchJson<{
      done?: boolean;
      error?: { message?: string; code?: number; details?: unknown[] };
    }>(url);
    if (op.done) {
      if (op.error) {
        throw new Error(`Operation failed: ${JSON.stringify(op.error)}`);
      }
      return;
    }
    await sleep(OP_POLL_MS);
  }
}

async function listAllGcsObjects(bucket: string, prefix: string): Promise<GcsObjectMeta[]> {
  const headers = await getAuthHeaders();
  const out: GcsObjectMeta[] = [];
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams({
      prefix,
      fields: "nextPageToken,items(name,md5Hash,crc32c,generation)",
    });
    if (pageToken) q.set("pageToken", pageToken);
    const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?${q}`;
    const res = await fetch(url, { headers });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      throw new Error(`GCS list failed ${res.status}: ${text}`);
    }
    const items = (data.items ?? []) as {
      name?: string;
      md5Hash?: string;
      crc32c?: string;
      generation?: string;
    }[];
    for (const it of items) {
      if (!it.name) continue;
      const fingerprint =
        it.md5Hash ?? (it.crc32c != null ? `crc32c:${it.crc32c}` : `gen:${it.generation ?? ""}`);
      if (!fingerprint) continue;
      out.push({ gsUri: `gs://${bucket}/${it.name}`, md5Hash: fingerprint });
    }
    pageToken = data.nextPageToken as string | undefined;
  } while (pageToken);
  return out;
}

type RagFile = RagFileStatus;

/**
 * Vertex may omit chunk counts on ListRagFiles; try ListRagChunks under each RagFile.
 * Returns null if the endpoint is unavailable or the call fails.
 */
async function listRagChunkCountForFile(ragFileResourceName: string): Promise<number | null> {
  const base = getAiplatformBase();
  let total = 0;
  let pageToken: string | undefined;
  try {
    do {
      const q = new URLSearchParams({ pageSize: "500" });
      if (pageToken) q.set("pageToken", pageToken);
      const url = `${base}/${ragFileResourceName}/ragChunks?${q}`;
      const data = await fetchJson<{
        ragChunks?: unknown[];
        nextPageToken?: string;
      }>(url);
      total += data.ragChunks?.length ?? 0;
      pageToken = data.nextPageToken;
    } while (pageToken);
    return total;
  } catch {
    return null;
  }
}

async function listAllRagFiles(): Promise<RagFile[]> {
  const parent = corpusParent();
  const base = getAiplatformBase();
  const files: RagFile[] = [];
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams({ pageSize: "100" });
    if (pageToken) q.set("pageToken", pageToken);
    const url = `${base}/${parent}/ragFiles?${q}`;
    const data = await fetchJson<{
      ragFiles?: RagFile[];
      nextPageToken?: string;
    }>(url);
    if (data.ragFiles?.length) files.push(...data.ragFiles);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return files;
}

function ragFileGcsUris(rf: RagFile): string[] {
  const uris = rf.gcsSource?.uris;
  return uris?.length ? uris : [];
}

async function deleteRagFile(ragFileName: string): Promise<void> {
  const base = getAiplatformBase();
  const url = `${base}/${ragFileName}`;
  const headers = await getAuthHeaders();
  const res = await fetch(url, { method: "DELETE", headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`DELETE ragFile ${ragFileName} -> ${res.status}: ${text}`);
  }
  const op = body as { name?: string; done?: boolean; error?: unknown };
  if (op.done) {
    if (op.error) throw new Error(`Delete failed: ${JSON.stringify(op.error)}`);
    return;
  }
  if (op.name) await waitForOperation(op.name);
}

async function deleteAllRagFiles(): Promise<void> {
  const ragFiles = await listAllRagFiles();
  console.log(`Deleting ${ragFiles.length} existing RagFile(s)…`);
  for (const rf of ragFiles) {
    if (!rf.name) continue;
    process.stdout.write(`  delete ${rf.name}\n`);
    await deleteRagFile(rf.name);
  }
}

async function importRagFileBatch(uris: string[]): Promise<void> {
  /* v8 ignore next -- defensive guard; callers always pass non-empty arrays */
  if (!uris.length) return;
  const parent = corpusParent();
  const base = getAiplatformBase();
  const url = `${base}/${parent}/ragFiles:import`;
  const body = {
    importRagFilesConfig: {
      ragFileTransformationConfig: {
        ragFileChunkingConfig: {
          fixedLengthChunking: {
            chunkSize: CHUNK_SIZE,
            chunkOverlap: CHUNK_OVERLAP,
          },
        },
      },
      gcsSource: { uris },
    },
  };
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`import -> ${res.status}: ${text}`);
  }
  const op = data as { name?: string; done?: boolean; error?: unknown };
  if (op.done) {
    if (op.error) throw new Error(`Import failed: ${JSON.stringify(op.error)}`);
    return;
  }
  if (op.name) await waitForOperation(op.name);
}

const manifestPath = () => path.join(process.cwd(), MANIFEST_FILENAME);

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
async function readManifest(): Promise<ImportManifest> {
  try {
    const raw = await fs.readFile(manifestPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ImportManifest>;
    if (parsed.version !== 1 || !isPlainRecord(parsed.files)) {
      return { version: 1, updatedAt: new Date(0).toISOString(), files: {} };
    }
    /* v8 ignore next -- always true here; line 281 already validated isPlainRecord */
    const files = isPlainRecord(parsed.files) ? parsed.files : {};
    return {
      version: 1,
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      files: files as ImportManifest["files"],
    };
  } catch {
    return { version: 1, updatedAt: new Date(0).toISOString(), files: {} };
  }
}

function buildManifest(
  objects: GcsObjectMeta[],
  previous: ImportManifest,
  importedUris: Set<string>
): ImportManifest {
  const importTime = new Date().toISOString();
  const files: Record<string, ManifestFileEntry> = {};
  for (const o of objects) {
    const prev = previous.files[o.gsUri];
    files[o.gsUri] = {
      md5: o.md5Hash,
      /* v8 ignore start -- V8 optional-chaining / nullish-coalescing branch artifact */
      lastImportedAt: importedUris.has(o.gsUri) ? importTime : (prev?.lastImportedAt ?? importTime),
      /* v8 ignore stop */
    };
  }
  return { version: 1, updatedAt: importTime, files };
}

async function deleteRagFilesForUris(targetUris: Set<string>): Promise<void> {
  /* v8 ignore next -- defensive guard; callers always pass non-empty sets */
  if (!targetUris.size) return;
  const ragFiles = await listAllRagFiles();
  for (const rf of ragFiles) {
    if (!rf.name) continue;
    const uris = ragFileGcsUris(rf);
    const hit = uris.some((u) => targetUris.has(u));
    if (hit) {
      console.log(`  removing stale RagFile for updated object: ${rf.name}`);
      await deleteRagFile(rf.name);
    }
  }
}

async function writeManifest(m: ImportManifest): Promise<void> {
  const manifestFilePath = manifestPath();
  const manifestDir = path.dirname(manifestFilePath);
  await fs.mkdir(manifestDir, { recursive: true });
  await fs.writeFile(manifestFilePath, JSON.stringify(m, null, 2) + "\n", "utf8");
}

async function printRagStatus(): Promise<void> {
  await printRagStatusReport({
    corpusParent: corpusParent(),
    listRagFiles: listAllRagFiles,
    listChunkCount: listRagChunkCountForFile,
    log: console.log.bind(console),
  });
}

/** Exported for tests (CLI entry detection). */
export function isExecutedAsCli(): boolean {
  const runPath = process.argv[1];
  if (!runPath) return false;
  try {
    return path.resolve(runPath) === path.resolve(fileURLToPath(import.meta.url));
  } catch {
    /* v8 ignore next -- only reachable if import.meta.url is not a file:// URL */
    return false;
  }
}

export async function main(): Promise<void> {
  const { force, diff, status } = parseFlags(process.argv.slice(2));
  if (status) {
    if (force || diff) {
      console.warn("Note: --status ignores import flags (--force, --diff).");
    }
    await printRagStatus();
    return;
  }

  if (force && diff) {
    console.warn(
      "Note: --force performs a full re-import; --diff is ignored when combined with --force."
    );
  }

  const bucket = contentBucket();
  const prefix = gcsPrefix();
  console.log(`Listing gs://${bucket}/${prefix}* …`);
  const objects = await listAllGcsObjects(bucket, prefix);
  if (!objects.length) {
    console.log("No objects found under prefix. Nothing to import.");
    return;
  }

  let toImport = objects;
  const manifest = await readManifest();

  if (force) {
    await deleteAllRagFiles();
  } else if (diff) {
    toImport = objects.filter((o) => manifest.files[o.gsUri]?.md5 !== o.md5Hash);
    console.log(`--diff: ${toImport.length} file(s) changed or new (of ${objects.length}).`);
    if (!toImport.length) {
      console.log("Manifest is up to date. No import needed.");
      const importTime = new Date().toISOString();
      const files: Record<string, ManifestFileEntry> = {};
      for (const o of objects) {
        const prev = manifest.files[o.gsUri];
        files[o.gsUri] = {
          md5: o.md5Hash,
          lastImportedAt: prev?.lastImportedAt ?? importTime,
        };
      }
      await writeManifest({ version: 1, updatedAt: importTime, files });
      return;
    }
    const uriSet = new Set(toImport.map((o) => o.gsUri));
    await deleteRagFilesForUris(uriSet);
  }

  const importedUris = new Set<string>();
  for (let i = 0; i < toImport.length; i += IMPORT_BATCH_SIZE) {
    const batch = toImport.slice(i, i + IMPORT_BATCH_SIZE).map((o) => o.gsUri);
    const batchNum = Math.floor(i / IMPORT_BATCH_SIZE) + 1;
    console.log(`\nImporting batch ${batchNum} (${batch.length} file(s))…`);
    for (const uri of batch) {
      console.log(`  📄 ${uri}`);
    }
    try {
      await importRagFileBatch(batch);
      for (const uri of batch) {
        console.log(`  ✅ ${uri}`);
        importedUris.add(uri);
      }
    } catch (err) {
      console.error(`  ❌ Batch ${batchNum} failed`);
      throw err;
    }
  }

  const mergedManifest = buildManifest(objects, manifest, importedUris);
  await writeManifest(mergedManifest);
  console.log(
    `Done. Wrote ${MANIFEST_FILENAME} with ${Object.keys(mergedManifest.files).length} ${
      Object.keys(mergedManifest.files).length === 1 ? "entry" : "entries"
    }.`
  );
}

/* v8 ignore start -- CLI entry point; only runs when executed directly, not importable in tests */
if (isExecutedAsCli()) {
  void (async () => {
    try {
      await main();
    } catch (e) {
      console.error("❌ Fatal error during import:", e);
      process.exit(1);
    }
  })();
}
/* v8 ignore stop */
