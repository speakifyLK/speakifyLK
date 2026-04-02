import { test, expect } from "@playwright/test";
import {
  captureEmptyCorpusStatus,
  captureFailedFileStatus,
  captureFormatterSnapshot,
  getRagStatusNpmScript,
} from "./helpers/rag-status-e2e-shared";

/**
 * End-to-end contract tests for the RAG corpus status feature (`npm run rag:status`).
 * Shared assertions live in `tests/helpers/rag-status-e2e-shared.ts`, mirrored by
 * `tests/rag-import-status.e2e.test.ts` for Vitest coverage.
 */
test.describe("RAG corpus status (rag:status)", () => {
  test("package.json wires rag:status to import-rag-files.ts with --status", () => {
    const cmd = getRagStatusNpmScript();
    expect(cmd).toContain("import-rag-files.ts");
    expect(cmd).toContain("--status");
  });

  test("printRagStatus reports an empty corpus like the CLI", async () => {
    const text = await captureEmptyCorpusStatus();
    expect(text).toContain("No RagFiles");
    expect(text).toMatch(/Total files:\s+0/);
    expect(text).toMatch(/Total chunks:\s+0/);
  });

  test("printRagStatus surfaces FAILED state and error text", async () => {
    const text = await captureFailedFileStatus();
    expect(text).toContain("FAILED");
    expect(text).toContain("ingestion timeout");
    expect(text).toMatch(/Failed:\s+1/);
  });

  test("shared formatters match CLI output conventions", () => {
    const s = captureFormatterSnapshot();
    expect(s.formatBytes512).toBe("512 B");
    expect(s.active).toBe("ACTIVE");
    expect(s.failed).toBe("FAILED");
    expect(s.importing).toBe("IMPORTING");
  });
});
