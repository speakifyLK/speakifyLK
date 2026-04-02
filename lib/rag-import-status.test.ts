import { describe, it, expect, vi } from "vitest";
import {
  displayImportState,
  extractChunkCountFromObject,
  formatBytes,
  mapInBatches,
  printRagStatus,
  readFileStatusFields,
  toNumber64,
  type RagFileStatus,
} from "./rag-import-status";

describe("toNumber64", () => {
  it("returns undefined for undefined", () => {
    expect(toNumber64(undefined)).toBeUndefined();
  });

  it("returns finite numbers as-is", () => {
    expect(toNumber64(42)).toBe(42);
  });

  it("parses numeric strings", () => {
    expect(toNumber64("9001")).toBe(9001);
  });

  it("returns undefined for non-numeric strings", () => {
    expect(toNumber64("nope")).toBeUndefined();
  });
});

describe("formatBytes", () => {
  it("returns em dash for undefined", () => {
    expect(formatBytes(undefined)).toBe("—");
  });

  it("returns em dash for negative", () => {
    expect(formatBytes(-1)).toBe("—");
  });

  it("formats bytes under 1024", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats KB with one decimal when under 10", () => {
    expect(formatBytes(1536)).toMatch(/^1\.5 KB$/);
  });

  it("formats larger values with zero decimals when n >= 10", () => {
    const tenKb = 10 * 1024;
    expect(formatBytes(tenKb)).toBe("10 KB");
  });

  it("walks up to TB and caps at last unit", () => {
    const tb = 3 * 1024 ** 4;
    expect(formatBytes(tb)).toMatch(/^3(\.0)? TB$/);
  });
});

describe("displayImportState", () => {
  it("maps ACTIVE and ERROR", () => {
    expect(displayImportState("ACTIVE")).toBe("ACTIVE");
    expect(displayImportState("ERROR")).toBe("FAILED");
  });

  it("trims whitespace", () => {
    expect(displayImportState("  ACTIVE  ")).toBe("ACTIVE");
  });

  it("treats unknown as IMPORTING", () => {
    expect(displayImportState(undefined)).toBe("IMPORTING");
    expect(displayImportState("STATE_UNSPECIFIED")).toBe("IMPORTING");
  });
});

describe("extractChunkCountFromObject", () => {
  it("reads numeric and string digit fields", () => {
    expect(extractChunkCountFromObject({ ragChunkCount: 7 })).toBe(7);
    expect(extractChunkCountFromObject({ chunkTotal: "12" })).toBe(12);
  });

  it("skips non-finite numbers and non-digit strings", () => {
    expect(extractChunkCountFromObject({ chunkCount: Number.NaN })).toBeUndefined();
    expect(extractChunkCountFromObject({ chunkCount: "12x" })).toBeUndefined();
  });

  it("reads from one nested object", () => {
    expect(extractChunkCountFromObject({ meta: { indexedChunkCount: 4 }, other: 1 })).toBe(4);
  });

  it("returns undefined beyond depth 1 nesting for chunk keys", () => {
    expect(
      extractChunkCountFromObject({
        a: { b: { chunkCount: 9 } },
      })
    ).toBeUndefined();
  });

  it("ignores keys without chunk or count/total", () => {
    expect(extractChunkCountFromObject({ chunkSize: 512 })).toBeUndefined();
    expect(extractChunkCountFromObject({ count: 1 })).toBeUndefined();
  });

  it("skips arrays as nested records", () => {
    expect(extractChunkCountFromObject({ items: [{ chunkCount: 1 }] })).toBeUndefined();
  });
});

describe("readFileStatusFields", () => {
  it("handles missing fileStatus", () => {
    expect(readFileStatusFields(undefined)).toEqual({
      state: undefined,
      errorMessage: undefined,
    });
  });

  it("reads camelCase and snake_case errors", () => {
    expect(readFileStatusFields({ state: "ERROR", errorStatus: "  boom  " })).toEqual({
      state: "ERROR",
      errorMessage: "boom",
    });
    expect(
      readFileStatusFields({
        state: "ERROR",
        error_status: "snake",
      } as unknown as RagFileStatus["fileStatus"])
    ).toEqual({ state: "ERROR", errorMessage: "snake" });
  });

  it("ignores non-string state values", () => {
    expect(
      readFileStatusFields({ state: 1, errorStatus: "e" } as unknown as RagFileStatus["fileStatus"])
    ).toEqual({ state: undefined, errorMessage: "e" });
  });
});

describe("mapInBatches", () => {
  it("returns empty for empty input", async () => {
    expect(await mapInBatches([], 3, async (x) => x)).toEqual([]);
  });

  it("processes in batches", async () => {
    const fn = vi.fn(async (n: number) => n * 2);
    const out = await mapInBatches([1, 2, 3, 4, 5], 2, fn);
    expect(out).toEqual([2, 4, 6, 8, 10]);
    expect(fn).toHaveBeenCalledTimes(5);
  });
});

describe("printRagStatus", () => {
  it("prints zero summary for empty corpus", async () => {
    const lines: string[] = [];
    await printRagStatus({
      corpusParent: "projects/p/locations/l/ragCorpora/c",
      listRagFiles: async () => [],
      listChunkCount: async () => null,
      log: ((...args: unknown[]) => lines.push(args.join(" "))) as typeof console.log,
    });
    expect(lines.some((l) => l.includes("No RagFiles"))).toBe(true);
    expect(lines.some((l) => l.includes("Total files:     0"))).toBe(true);
  });

  it("prints ACTIVE file with inline chunk count and full total", async () => {
    const lines: string[] = [];
    const files: RagFileStatus[] = [
      {
        name: "projects/p/locations/l/ragCorpora/c/ragFiles/f1",
        displayName: "lesson.md",
        sizeBytes: "2048",
        ragChunkCount: 5,
        fileStatus: { state: "ACTIVE" },
      } as RagFileStatus,
    ];
    await printRagStatus({
      corpusParent: "projects/p/locations/l/ragCorpora/c",
      listRagFiles: async () => files,
      listChunkCount: async () => null,
      log: ((...args: unknown[]) => lines.push(args.join(" "))) as typeof console.log,
    });
    expect(lines.some((l) => l.includes("ACTIVE"))).toBe(true);
    expect(lines.some((l) => l.includes("Chunks: 5"))).toBe(true);
    expect(lines.some((l) => l.includes("Total chunks:    5"))).toBe(true);
  });

  it("uses listChunkCount when inline count missing", async () => {
    const lines: string[] = [];
    const files: RagFileStatus[] = [
      {
        name: "projects/p/locations/l/ragCorpora/c/ragFiles/f1",
        displayName: "a",
        fileStatus: { state: "ACTIVE" },
      },
    ];
    await printRagStatus({
      corpusParent: "projects/p/locations/l/ragCorpora/c",
      listRagFiles: async () => files,
      listChunkCount: async () => 8,
      log: ((...args: unknown[]) => lines.push(args.join(" "))) as typeof console.log,
    });
    expect(lines.some((l) => l.includes("Chunks: 8"))).toBe(true);
  });

  it("shows partial totals when chunk count is null", async () => {
    const lines: string[] = [];
    const files: RagFileStatus[] = [
      {
        name: "projects/p/locations/l/ragCorpora/c/ragFiles/f1",
        displayName: "a",
        fileStatus: { state: "ACTIVE" },
      },
    ];
    await printRagStatus({
      corpusParent: "projects/p/locations/l/ragCorpora/c",
      listRagFiles: async () => files,
      listChunkCount: async () => null,
      log: ((...args: unknown[]) => lines.push(args.join(" "))) as typeof console.log,
    });
    expect(lines.some((l) => l.includes("partial"))).toBe(true);
    expect(lines.some((l) => l.includes("Chunks: —"))).toBe(true);
  });

  it("formats FAILED with error and default message when missing", async () => {
    const lines: string[] = [];
    await printRagStatus({
      corpusParent: "projects/p/locations/l/ragCorpora/c",
      listRagFiles: async () => [
        {
          name: "projects/p/locations/l/ragCorpora/c/ragFiles/bad",
          displayName: "bad.txt",
          fileStatus: { state: "ERROR", errorStatus: "parse failed" },
        },
      ],
      listChunkCount: async () => null,
      log: ((...args: unknown[]) => lines.push(args.join(" "))) as typeof console.log,
    });
    expect(lines.some((l) => l.startsWith("FAILED"))).toBe(true);
    expect(lines.some((l) => l.includes("parse failed"))).toBe(true);

    const lines2: string[] = [];
    await printRagStatus({
      corpusParent: "projects/p/locations/l/ragCorpora/c",
      listRagFiles: async () => [
        {
          name: "x",
          displayName: "x",
          fileStatus: { state: "ERROR" },
        },
      ],
      listChunkCount: async () => null,
      log: ((...args: unknown[]) => lines2.push(args.join(" "))) as typeof console.log,
    });
    expect(lines2.some((l) => l.includes("(no error details from API)"))).toBe(true);
  });

  it("treats missing rag file name like empty for chunk resolution", async () => {
    const listChunkCount = vi.fn(async () => 1);
    await printRagStatus({
      corpusParent: "projects/p/locations/l/ragCorpora/c",
      listRagFiles: async () => [{ displayName: "n", fileStatus: { state: "ACTIVE" } }],
      listChunkCount,
      log: vi.fn() as typeof console.log,
    });
    expect(listChunkCount).not.toHaveBeenCalled();
  });

  it("uses listChunkCount only when name is non-empty after trim", async () => {
    const listChunkCount = vi.fn(async () => 99);
    const lines: string[] = [];
    await printRagStatus({
      corpusParent: "projects/p/locations/l/ragCorpora/c",
      listRagFiles: async () => [
        {
          name: "   ",
          displayName: "only-spaces-name",
          fileStatus: { state: "ACTIVE" },
        },
      ],
      listChunkCount,
      log: ((...args: unknown[]) => lines.push(args.join(" "))) as typeof console.log,
    });
    expect(listChunkCount).not.toHaveBeenCalled();
    expect(lines.some((l) => l.includes("Chunks: —"))).toBe(true);
  });

  it("labels unnamed file and skips resource line when empty", async () => {
    const lines: string[] = [];
    await printRagStatus({
      corpusParent: "projects/p/locations/l/ragCorpora/c",
      listRagFiles: async () => [
        {
          displayName: "",
          name: "",
          fileStatus: { state: "ACTIVE" },
        },
      ],
      listChunkCount: async () => null,
      log: ((...args: unknown[]) => lines.push(args.join(" "))) as typeof console.log,
    });
    expect(lines.some((l) => l.includes("(unnamed)"))).toBe(true);
  });

  it("paginates enrichment with batch size 10", async () => {
    const lines: string[] = [];
    const files: RagFileStatus[] = Array.from({ length: 11 }, (_, i) => ({
      name: `projects/p/locations/l/ragCorpora/c/ragFiles/f${i}`,
      displayName: `f${i}`,
      ragChunkCount: 1,
      fileStatus: { state: "ACTIVE" },
    })) as RagFileStatus[];
    await printRagStatus({
      corpusParent: "projects/p/locations/l/ragCorpora/c",
      listRagFiles: async () => files,
      listChunkCount: async () => null,
      log: ((...args: unknown[]) => lines.push(args.join(" "))) as typeof console.log,
    });
    expect(lines.some((l) => l.includes("Total files:     11"))).toBe(true);
    expect(lines.some((l) => l.includes("Total chunks:    11"))).toBe(true);
  });
});
