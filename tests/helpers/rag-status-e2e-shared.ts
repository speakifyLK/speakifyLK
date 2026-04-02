import { readFileSync } from "node:fs";
import path from "node:path";
import { displayImportState, formatBytes, printRagStatus } from "../../lib/rag-import-status";

export function getRagStatusNpmScript(): string {
  const pkgPath = path.join(process.cwd(), "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  const cmd = pkg.scripts?.["rag:status"];
  if (!cmd) throw new Error('package.json missing scripts["rag:status"]');
  return cmd;
}

export async function captureEmptyCorpusStatus(): Promise<string> {
  const lines: string[] = [];
  await printRagStatus({
    corpusParent: "projects/demo/locations/us-central1/ragCorpora/corpus",
    listRagFiles: async () => [],
    listChunkCount: async () => null,
    log: ((...args: unknown[]) => lines.push(args.map(String).join(" "))) as typeof console.log,
  });
  return lines.join("\n");
}

export async function captureFailedFileStatus(): Promise<string> {
  const lines: string[] = [];
  await printRagStatus({
    corpusParent: "projects/demo/locations/us-central1/ragCorpora/corpus",
    listRagFiles: async () => [
      {
        name: "projects/demo/locations/us-central1/ragCorpora/corpus/ragFiles/x",
        displayName: "broken.md",
        fileStatus: { state: "ERROR", errorStatus: "ingestion timeout" },
      },
    ],
    listChunkCount: async () => null,
    log: ((...args: unknown[]) => lines.push(args.map(String).join(" "))) as typeof console.log,
  });
  return lines.join("\n");
}

export function captureFormatterSnapshot(): {
  formatBytes512: string;
  active: string;
  failed: string;
  importing: string;
} {
  return {
    formatBytes512: formatBytes(512),
    active: displayImportState("ACTIVE"),
    failed: displayImportState("ERROR"),
    importing: displayImportState(undefined),
  };
}
