// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* ── Mocks ─────────────────────────────────────────────────────────── */

// Mock dotenv before importing the script
vi.mock("dotenv", () => ({
  config: vi.fn(),
}));

// Mock ../lib/gemini – dynamic import inside testGemini()
const generateContentMock = vi.fn();
vi.mock("../lib/gemini", () => ({
  generateContent: generateContentMock,
}));

const flushPromises = () => new Promise<void>((r) => setTimeout(r, 100));

describe("test-gemini script", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    generateContentMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("logs successful Gemini response", async () => {
    generateContentMock.mockResolvedValue({ text: "Hello in 3 languages" });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await import("./test-gemini");
    await flushPromises();

    expect(generateContentMock).toHaveBeenCalledWith(
      "Say hello in three different languages. Keep it brief."
    );
    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Gemini responded successfully");
    expect(output).toContain("Hello in 3 languages");
  });

  it("logs error and exits when generateContent throws (with errorDetails)", async () => {
    const err = Object.assign(new Error("boom"), {
      status: 500,
      errorDetails: [{ reason: "INTERNAL" }],
    });
    generateContentMock.mockRejectedValue(err);

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    await import("./test-gemini");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Gemini test failed");
    expect(output).toContain("500");
    expect(output).toContain("boom");
    expect(output).toContain("INTERNAL");
  });

  it("logs error and exits when generateContent throws (without errorDetails)", async () => {
    const err = Object.assign(new Error("auth failed"), {
      status: 401,
    });
    generateContentMock.mockRejectedValue(err);

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    await import("./test-gemini");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Gemini test failed");
    expect(output).toContain("401");
    expect(output).toContain("auth failed");
    // Should NOT contain Details line since no errorDetails
    expect(output).not.toContain("Details:");
  });
});
