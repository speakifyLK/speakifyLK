// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* ── Mocks ─────────────────────────────────────────────────────────── */

vi.mock("dotenv", () => ({
  config: vi.fn(),
}));

const generateContentMock = vi.fn();
const getGeminiClientMock = vi.fn();
const getModelMock = vi.fn();

vi.mock("../lib/gemini", () => ({
  generateContent: generateContentMock,
  getGeminiClient: getGeminiClientMock,
  getModel: getModelMock,
}));

const flushPromises = () => new Promise<void>((r) => setTimeout(r, 100));

describe("test-gcp-auth script", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    generateContentMock.mockReset();
    getGeminiClientMock.mockReset();
    getModelMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  // ── env checks ──

  it("exits when GOOGLE_SERVICE_ACCOUNT_KEY is missing", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = "";
    process.env.GEMINI_MODEL = "gemini-pro";

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./test-gcp-auth");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("GOOGLE_SERVICE_ACCOUNT_KEY is not set");
  });

  it("exits when GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = "not-json";
    process.env.GEMINI_MODEL = "gemini-pro";

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./test-gcp-auth");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("not valid JSON");
  });

  it("exits when GEMINI_MODEL is missing", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: "test",
      client_email: "sa@test.iam.gserviceaccount.com",
    });
    process.env.GEMINI_MODEL = "";

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./test-gcp-auth");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("GEMINI_MODEL is not set");
  });

  // ── full success path (response contains expected text) ──

  it("completes successfully when all APIs return expected text", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: "test",
      client_email: "sa@test.iam.gserviceaccount.com",
    });
    process.env.GEMINI_MODEL = "gemini-pro";

    getGeminiClientMock.mockReturnValue({
      models: {
        generateContentStream: vi.fn().mockResolvedValue(
          (async function* () {
            yield { text: "STREAM_OK" };
          })()
        ),
      },
    });
    getModelMock.mockReturnValue("gemini-pro");
    generateContentMock.mockResolvedValue({ text: "SERVICE_ACCOUNT_OK" });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await import("./test-gcp-auth");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Service account JSON parsed successfully");
    expect(output).toContain("Client initialized successfully");
    expect(output).toContain("SERVICE_ACCOUNT_OK");
    expect(output).toContain("STREAM_OK");
    expect(output).toContain("All tests passed");
  });

  // ── success but response text doesn't contain expected string ──

  it("warns when generateContent response does not contain SERVICE_ACCOUNT_OK", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: "test",
      client_email: "sa@test.iam.gserviceaccount.com",
    });
    process.env.GEMINI_MODEL = "gemini-pro";

    getGeminiClientMock.mockReturnValue({
      models: {
        generateContentStream: vi.fn().mockResolvedValue(
          (async function* () {
            yield { text: "STREAM_OK" };
          })()
        ),
      },
    });
    getModelMock.mockReturnValue("gemini-pro");
    generateContentMock.mockResolvedValue({ text: "something else" });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await import("./test-gcp-auth");
    await flushPromises();

    const warnOutput = warnSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(warnOutput).toContain("Response did not contain expected text");
  });

  it("warns when stream response does not contain STREAM_OK", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: "test",
      client_email: "sa@test.iam.gserviceaccount.com",
    });
    process.env.GEMINI_MODEL = "gemini-pro";

    getGeminiClientMock.mockReturnValue({
      models: {
        generateContentStream: vi.fn().mockResolvedValue(
          (async function* () {
            yield { text: "other" };
          })()
        ),
      },
    });
    getModelMock.mockReturnValue("gemini-pro");
    generateContentMock.mockResolvedValue({ text: "SERVICE_ACCOUNT_OK" });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await import("./test-gcp-auth");
    await flushPromises();

    const warnOutput = warnSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(warnOutput).toContain("Streamed response did not contain expected text");
  });

  // ── generateContent error ──

  it("exits when generateContent throws (with errorDetails)", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: "test",
      client_email: "sa@test.iam.gserviceaccount.com",
    });
    process.env.GEMINI_MODEL = "gemini-pro";

    const err = Object.assign(new Error("gen fail"), {
      status: 500,
      errorDetails: [{ reason: "INTERNAL" }],
    });
    generateContentMock.mockRejectedValue(err);
    getGeminiClientMock.mockReturnValue({});

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./test-gcp-auth");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("generateContent() failed");
    expect(output).toContain("500");
    expect(output).toContain("INTERNAL");
  });

  it("exits when generateContent throws (without errorDetails)", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: "test",
      client_email: "sa@test.iam.gserviceaccount.com",
    });
    process.env.GEMINI_MODEL = "gemini-pro";

    const err = Object.assign(new Error("gen fail"), { status: 403 });
    generateContentMock.mockRejectedValue(err);
    getGeminiClientMock.mockReturnValue({});

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./test-gcp-auth");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("generateContent() failed");
    expect(output).not.toContain("Details:");
  });

  // ── stream error ──

  it("exits when generateContentStream throws (with errorDetails)", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: "test",
      client_email: "sa@test.iam.gserviceaccount.com",
    });
    process.env.GEMINI_MODEL = "gemini-pro";

    generateContentMock.mockResolvedValue({ text: "SERVICE_ACCOUNT_OK" });
    const streamErr = Object.assign(new Error("stream fail"), {
      status: 503,
      errorDetails: [{ reason: "UNAVAILABLE" }],
    });
    getGeminiClientMock.mockReturnValue({
      models: {
        generateContentStream: vi.fn().mockRejectedValue(streamErr),
      },
    });
    getModelMock.mockReturnValue("gemini-pro");

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./test-gcp-auth");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("generateContentStream() failed");
    expect(output).toContain("503");
    expect(output).toContain("UNAVAILABLE");
  });

  it("exits when generateContentStream throws (without errorDetails)", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: "test",
      client_email: "sa@test.iam.gserviceaccount.com",
    });
    process.env.GEMINI_MODEL = "gemini-pro";

    generateContentMock.mockResolvedValue({ text: "SERVICE_ACCOUNT_OK" });
    const streamErr = Object.assign(new Error("stream fail"), { status: 502 });
    getGeminiClientMock.mockReturnValue({
      models: {
        generateContentStream: vi.fn().mockRejectedValue(streamErr),
      },
    });
    getModelMock.mockReturnValue("gemini-pro");

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    await import("./test-gcp-auth");
    await flushPromises();

    expect(exitSpy).toHaveBeenCalledWith(1);
    const output = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("generateContentStream() failed");
    expect(output).not.toContain("Details:");
  });

  // ── null text from generateContent (covers `?? ""`) ──

  it("handles null text from generateContent (uses ?? fallback)", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: "test",
      client_email: "sa@test.iam.gserviceaccount.com",
    });
    process.env.GEMINI_MODEL = "gemini-pro";

    generateContentMock.mockResolvedValue({ text: null });
    getGeminiClientMock.mockReturnValue({
      models: {
        generateContentStream: vi.fn().mockResolvedValue(
          (async function* () {
            yield { text: "STREAM_OK" };
          })()
        ),
      },
    });
    getModelMock.mockReturnValue("gemini-pro");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await import("./test-gcp-auth");
    await flushPromises();

    // text is "" due to ?? "", which won't contain SERVICE_ACCOUNT_OK => warn
    const warnOutput = warnSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(warnOutput).toContain("Response did not contain expected text");
  });

  // ── null text in stream chunk (covers `?? ""`) ──

  it("handles null text in stream chunk (uses ?? fallback)", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      project_id: "test",
      client_email: "sa@test.iam.gserviceaccount.com",
    });
    process.env.GEMINI_MODEL = "gemini-pro";

    generateContentMock.mockResolvedValue({ text: "SERVICE_ACCOUNT_OK" });
    getGeminiClientMock.mockReturnValue({
      models: {
        generateContentStream: vi.fn().mockResolvedValue(
          (async function* () {
            yield { text: null };
            yield { text: "STREAM_OK" };
          })()
        ),
      },
    });
    getModelMock.mockReturnValue("gemini-pro");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await import("./test-gcp-auth");
    await flushPromises();

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("STREAM_OK");
    expect(output).toContain("All tests passed");
  });
});
