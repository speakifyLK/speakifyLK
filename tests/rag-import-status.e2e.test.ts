import { describe, it, expect } from "vitest";
import {
  captureEmptyCorpusStatus,
  captureFailedFileStatus,
  captureFormatterSnapshot,
  getRagStatusNpmScript,
} from "./helpers/rag-status-e2e-shared";

/**
 * Vitest mirror of Playwright `tests/rag-import-status.spec.ts` so the same
 * RAG status contract runs in the unit/coverage pipeline at 100% for `lib/rag-import-status.ts`.
 */
describe("RAG corpus status (E2E contract mirror)", () => {
  it("package.json wires rag:status to import-rag-files.ts with --status", () => {
    const cmd = getRagStatusNpmScript();
    expect(cmd).toContain("import-rag-files.ts");
    expect(cmd).toContain("--status");
  });

  it("printRagStatus reports an empty corpus like the CLI", async () => {
    const text = await captureEmptyCorpusStatus();
    expect(text).toContain("No RagFiles");
    expect(text).toMatch(/Total files:\s+0/);
    expect(text).toMatch(/Total chunks:\s+0/);
  });

  it("printRagStatus surfaces FAILED state and error text", async () => {
    const text = await captureFailedFileStatus();
    expect(text).toContain("FAILED");
    expect(text).toContain("ingestion timeout");
    expect(text).toMatch(/Failed:\s+1/);
  });

  it("shared formatters match CLI output conventions", () => {
    const s = captureFormatterSnapshot();
    expect(s.formatBytes512).toBe("512 B");
    expect(s.active).toBe("ACTIVE");
    expect(s.failed).toBe("FAILED");
    expect(s.importing).toBe("IMPORTING");
  });
});
