/**
 * RAG corpus file status reporting (used by scripts/import-rag-files.ts --status).
 */

export type RagFileStatus = {
  name?: string;
  displayName?: string;
  sizeBytes?: string | number;
  gcsSource?: { uris?: string[] };
  fileStatus?: {
    state?: string;
    errorStatus?: string;
  };
};

export type DisplayImportState = "ACTIVE" | "IMPORTING" | "FAILED";

export function toNumber64(v: string | number | undefined): number | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let n = bytes;
  let u = -1;
  do {
    n /= 1024;
    u += 1;
  } while (n >= 1024 && u < units.length - 1);
  return `${n.toFixed(n >= 10 ? 0 : 1)} ${units[u]}`;
}

export function displayImportState(apiState: string | undefined): DisplayImportState {
  const s = apiState?.trim() || "";
  if (s === "ACTIVE") return "ACTIVE";
  if (s === "ERROR") return "FAILED";
  return "IMPORTING";
}

export function extractChunkCountFromObject(
  obj: Record<string, unknown>,
  depth = 0
): number | undefined {
  if (depth > 1) return undefined;
  for (const [key, value] of Object.entries(obj)) {
    if (!/chunk/i.test(key) || !/count|total/i.test(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const inner = extractChunkCountFromObject(value as Record<string, unknown>, depth + 1);
      if (inner !== undefined) return inner;
    }
  }
  return undefined;
}

export function readFileStatusFields(fs: RagFileStatus["fileStatus"]): {
  state: string | undefined;
  errorMessage: string | undefined;
} {
  if (!fs) return { state: undefined, errorMessage: undefined };
  const rec = fs as Record<string, unknown>;
  const state = typeof rec.state === "string" ? rec.state : undefined;
  const errRaw = rec.errorStatus ?? rec.error_status;
  const err = typeof errRaw === "string" ? errRaw.trim() : undefined;
  return { state, errorMessage: err || undefined };
}

export async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    out.push(...(await Promise.all(batch.map(fn))));
  }
  return out;
}

export type PrintRagStatusDeps = {
  corpusParent: string;
  listRagFiles: () => Promise<RagFileStatus[]>;
  listChunkCount: (ragFileResourceName: string) => Promise<number | null>;
  log: typeof console.log;
};

export async function printRagStatus(deps: PrintRagStatusDeps): Promise<void> {
  const { corpusParent: parent, listRagFiles, listChunkCount, log } = deps;
  log(`Rag corpus: ${parent}`);
  log("Listing RagFiles via ListRagFiles…\n");

  const files = await listRagFiles();
  if (!files.length) {
    log("No RagFiles in this corpus.\n");
    log("--- Summary ---");
    log("Total files:     0");
    log("Active:          0");
    log("Failed:          0");
    log("Total chunks:    0");
    return;
  }

  type Enriched = {
    resourceName: string;
    label: string;
    displayState: DisplayImportState;
    chunkCount: number | null;
    sizeBytes: number | undefined;
    errorReason: string | undefined;
  };

  const enriched: Enriched[] = await mapInBatches(files, 10, async (rf) => {
    const resourceName = rf.name?.trim() ?? "";
    const raw = rf as Record<string, unknown>;
    const inlineChunks = extractChunkCountFromObject(raw);
    let chunkCount: number | null;
    if (inlineChunks !== undefined) {
      chunkCount = inlineChunks;
    } else if (resourceName) {
      chunkCount = await listChunkCount(resourceName);
    } else {
      chunkCount = null;
    }

    const { state: apiState, errorMessage } = readFileStatusFields(rf.fileStatus);
    const displayState = displayImportState(apiState);

    return {
      resourceName,
      label: rf.displayName?.trim() || resourceName || "(unnamed)",
      displayState,
      chunkCount,
      sizeBytes: toNumber64(rf.sizeBytes),
      errorReason: errorMessage,
    };
  });

  log("--- RagFiles ---\n");
  for (const e of enriched) {
    const sizeStr = formatBytes(e.sizeBytes);
    const chunkStr = e.chunkCount === null ? "—" : String(e.chunkCount);

    if (e.displayState === "FAILED") {
      log(`FAILED  ${e.label}`);
      log(`  Name (resource): ${e.resourceName}`);
      log(`  State:            FAILED`);
      log(`  Chunk count:      ${chunkStr}`);
      log(`  Size:             ${sizeStr}`);
      log(`  Error:            ${e.errorReason?.trim() || "(no error details from API)"}`);
      log("");
    } else {
      log(`${e.displayState.padEnd(10)} ${e.label}`);
      log(`           Chunks: ${chunkStr}  |  Size: ${sizeStr}`);
      if (e.resourceName) log(`           ${e.resourceName}`);
      log("");
    }
  }

  let active = 0;
  let failed = 0;
  let totalChunks = 0;
  let chunksPartial = false;
  for (const e of enriched) {
    if (e.displayState === "ACTIVE") active += 1;
    if (e.displayState === "FAILED") failed += 1;
    if (e.chunkCount === null) chunksPartial = true;
    else totalChunks += e.chunkCount;
  }

  log("--- Summary ---");
  log(`Total files:     ${enriched.length}`);
  log(`Active:          ${active}`);
  log(`Failed:          ${failed}`);
  log(
    `Total chunks:    ${chunksPartial ? `${totalChunks} (partial; some counts unavailable)` : String(totalChunks)}`
  );
}
