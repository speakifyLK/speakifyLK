import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @google/genai before importing the module
vi.mock("@google/genai", () => {
  const mockCreate = vi.fn().mockReturnValue({ __mockChat: true });
  const mockGenerateContent = vi
    .fn()
    .mockResolvedValue({ text: "mock response" });
  const MockGoogleGenAI = vi.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
    chats: { create: mockCreate },
  }));

  return {
    GoogleGenAI: MockGoogleGenAI,
    HarmCategory: {
      HARM_CATEGORY_HARASSMENT: "HARM_CATEGORY_HARASSMENT",
      HARM_CATEGORY_HATE_SPEECH: "HARM_CATEGORY_HATE_SPEECH",
      HARM_CATEGORY_SEXUALLY_EXPLICIT: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      HARM_CATEGORY_DANGEROUS_CONTENT: "HARM_CATEGORY_DANGEROUS_CONTENT",
    },
    HarmBlockThreshold: {
      BLOCK_NONE: "BLOCK_NONE",
      BLOCK_MEDIUM_AND_ABOVE: "BLOCK_MEDIUM_AND_ABOVE",
    },
  };
});

import { GoogleGenAI } from "@google/genai";

describe("gemini module", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.mocked(GoogleGenAI).mockClear();
    process.env.GEMINI_API_KEY = "test-api-key";
    process.env.GEMINI_MODEL = "gemini-test-model";
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = undefined as unknown as string;
    process.env.GEMINI_UNSAFE_MODE = undefined as unknown as string;
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("safetySettings", () => {
    it("exports an array of 4 safety settings", async () => {
      const { safetySettings } = await import("./gemini");
      expect(Array.isArray(safetySettings)).toBe(true);
      expect(safetySettings).toHaveLength(4);
    });

    it("uses BLOCK_MEDIUM_AND_ABOVE by default (non-unsafe mode)", async () => {
      const { safetySettings } = await import("./gemini");
      for (const setting of safetySettings) {
        expect(setting.threshold).toBe("BLOCK_MEDIUM_AND_ABOVE");
      }
    });

    it("uses BLOCK_NONE when GEMINI_UNSAFE_MODE=1 and not production", async () => {
      process.env.GEMINI_UNSAFE_MODE = "1";
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      const { safetySettings } = await import("./gemini");
      for (const setting of safetySettings) {
        expect(setting.threshold).toBe("BLOCK_NONE");
      }
    });

    it("keeps BLOCK_MEDIUM_AND_ABOVE when GEMINI_UNSAFE_MODE=1 but NODE_ENV=production", async () => {
      process.env.GEMINI_UNSAFE_MODE = "1";
      (process.env as Record<string, string | undefined>).NODE_ENV =
        "production";
      const { safetySettings } = await import("./gemini");
      for (const setting of safetySettings) {
        expect(setting.threshold).toBe("BLOCK_MEDIUM_AND_ABOVE");
      }
    });
  });

  describe("generationConfig", () => {
    it("exports expected generation config", async () => {
      const { generationConfig } = await import("./gemini");
      expect(generationConfig).toEqual({
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 8192,
      });
    });
  });

  describe("getModel", () => {
    it("returns the GEMINI_MODEL env var", async () => {
      process.env.GEMINI_MODEL = "gemini-custom-model";
      const { getModel } = await import("./gemini");
      expect(getModel()).toBe("gemini-custom-model");
    });

    it("throws when GEMINI_MODEL is not set", async () => {
      delete process.env.GEMINI_MODEL;
      const { getModel } = await import("./gemini");
      expect(() => getModel()).toThrow(
        "GEMINI_MODEL environment variable is not set"
      );
    });
  });

  describe("getGeminiClient", () => {
    it("creates a GoogleGenAI client using API key when no service account is set", async () => {
      const { getGeminiClient } = await import("./gemini");
      const client = getGeminiClient();
      expect(client).toBeDefined();
      expect(GoogleGenAI).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: "test-api-key" })
      );
    });

    it("creates a GoogleGenAI client using service account when GOOGLE_SERVICE_ACCOUNT_KEY is set", async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
        type: "service_account",
        project_id: "test-project",
      });
      const { getGeminiClient } = await import("./gemini");
      const client = getGeminiClient();
      expect(client).toBeDefined();
      expect(GoogleGenAI).toHaveBeenCalledWith(
        expect.objectContaining({ googleAuthOptions: expect.any(Object) })
      );
    });

    it("returns the same client instance on repeated calls (singleton)", async () => {
      const { getGeminiClient } = await import("./gemini");
      const a = getGeminiClient();
      const b = getGeminiClient();
      expect(a).toBe(b);
      // Constructor should only have been called once
      expect(vi.mocked(GoogleGenAI)).toHaveBeenCalledTimes(1);
    });

    it("throws when GEMINI_API_KEY is not set and no service account key is present", async () => {
      process.env.GEMINI_API_KEY = undefined as unknown as string;
      const { getGeminiClient } = await import("./gemini");
      expect(() => getGeminiClient()).toThrow(
        "GEMINI_API_KEY environment variable is not set"
      );
    });

    it("falls back to API key when GOOGLE_SERVICE_ACCOUNT_KEY is invalid JSON", async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = "not-valid-json";
      const { getGeminiClient } = await import("./gemini");
      const client = getGeminiClient();
      expect(client).toBeDefined();
      expect(GoogleGenAI).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: "test-api-key" })
      );
    });
  });

  describe("generateContent", () => {
    it("calls models.generateContent with the prompt and model", async () => {
      const { generateContent, getGeminiClient } = await import("./gemini");
      const client = getGeminiClient();
      await generateContent("hello world");
      expect(client.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-test-model",
          contents: "hello world",
        })
      );
    });

    it("merges custom config overrides", async () => {
      const { generateContent, getGeminiClient } = await import("./gemini");
      const client = getGeminiClient();
      await generateContent("prompt", { maxOutputTokens: 1024 });
      expect(client.models.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({ maxOutputTokens: 1024 }),
        })
      );
    });
  });

  describe("startChatSession", () => {
    it("creates a chat session with empty history by default", async () => {
      const { startChatSession, getGeminiClient } = await import("./gemini");
      const client = getGeminiClient();
      startChatSession();
      expect(client.chats.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-test-model",
          history: [],
        })
      );
    });

    it("passes provided history to the chat session", async () => {
      const { startChatSession, getGeminiClient } = await import("./gemini");
      const client = getGeminiClient();
      const history = [{ role: "user" as const, parts: [{ text: "hi" }] }];
      startChatSession(history);
      expect(client.chats.create).toHaveBeenCalledWith(
        expect.objectContaining({ history })
      );
    });
  });
});
