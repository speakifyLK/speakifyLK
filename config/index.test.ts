import { describe, it, expect } from "vitest";

import { siteConfig, links } from "./index";

describe("config", () => {
  it("siteConfig has correct title", () => {
    expect(siteConfig.title).toBe("Speakify");
  });

  it("siteConfig has a description", () => {
    expect(typeof siteConfig.description).toBe("string");
    expect((siteConfig.description as string).length).toBeGreaterThan(0);
  });

  it("siteConfig has keywords array", () => {
    expect(Array.isArray(siteConfig.keywords)).toBe(true);
    expect((siteConfig.keywords as string[]).length).toBeGreaterThan(0);
  });

  it("siteConfig has authors", () => {
    const authors = siteConfig.authors as { name: string; url: string };
    expect(authors.name).toBe("SpeakifyLK");
    expect(authors.url).toBe("https://github.com/speakifyLK");
  });

  it("links has sourceCode", () => {
    expect(links.sourceCode).toBe("https://github.com/speakifyLK/speakifyLK");
  });

  it("links has email", () => {
    expect(links.email).toBe("speakifylk@gmail.com");
  });
});
