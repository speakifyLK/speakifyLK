import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cn, absoluteUrl, shuffleArray } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("deduplicates tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });

  it("handles undefined and null gracefully", () => {
    expect(cn(undefined, null, "foo")).toBe("foo");
  });

  it("handles array of classes", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });
});

describe("absoluteUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalEnv;
  });

  it("prepends the app URL to a path", () => {
    expect(absoluteUrl("/shop")).toBe("https://example.com/shop");
  });

  it("works with root path", () => {
    expect(absoluteUrl("/")).toBe("https://example.com/");
  });

  it("works with nested path", () => {
    expect(absoluteUrl("/api/webhooks/stripe")).toBe("https://example.com/api/webhooks/stripe");
  });

  it("returns undefined-prefixed string when env var is not set", () => {
    process.env.NEXT_PUBLIC_APP_URL = undefined as unknown as string;
    expect(absoluteUrl("/shop")).toBe("undefined/shop");
  });
});

describe("shuffleArray", () => {
  it("preserves all elements in the array", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result).toHaveLength(input.length);
    expect(result.sort()).toEqual(input.sort());
  });

  it("does not mutate the original array", () => {
    const input = [1, 2, 3];
    const copy = [...input];
    shuffleArray(input);
    expect(input).toEqual(copy);
  });

  it("handles empty arrays", () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it("handles single-element arrays", () => {
    expect(shuffleArray([1])).toEqual([1]);
  });

  it("eventually shuffles (non-deterministic check)", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let shuffledOnce = false;
    // Run a few times to avoid extremely rare chance of landing on same order
    for (let i = 0; i < 5; i++) {
      const result = shuffleArray(input);
      if (JSON.stringify(result) !== JSON.stringify(input)) {
        shuffledOnce = true;
        break;
      }
    }
    expect(shuffledOnce).toBe(true);
  });
});
