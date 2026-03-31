import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cn, absoluteUrl } from "./utils";

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
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(absoluteUrl("/shop")).toBe("undefined/shop");
  });
});
