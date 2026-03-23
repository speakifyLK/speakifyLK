import { GoogleGenAI, HarmCategory, HarmBlockThreshold, type Content } from "@google/genai";

/**
 * When set to '1', safety filters are disabled (BLOCK_NONE) in non-production
 * environments. In production, this override is ignored to avoid disabling
 * safety filters by accident. Otherwise, the default
 * BLOCK_MEDIUM_AND_ABOVE threshold is used.
 */
const isUnsafeModeEnv = process.env.GEMINI_UNSAFE_MODE === "1";
const isUnsafeMode = isUnsafeModeEnv && process.env.NODE_ENV !== "production";

if (isUnsafeModeEnv && process.env.NODE_ENV === "production") {
  console.warn(
    "GEMINI_UNSAFE_MODE=1 is set but ignored in production to prevent " +
      "disabling Gemini safety filters."
  );
}

const safetyThreshold = isUnsafeMode
  ? HarmBlockThreshold.BLOCK_NONE
  : HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE;

export const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: safetyThreshold },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: safetyThreshold },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: safetyThreshold },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: safetyThreshold },
];

export const generationConfig = {
  temperature: 0.7,
  topP: 0.9,
  maxOutputTokens: 8192,
};

function getServiceAccountCredentials(): Record<string, unknown> | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    console.warn(
      "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. Falling back to API key authentication."
    );
    return null;
  }
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY environment variable is not set. " +
        "Add it to your .env or .env.local file.\n" +
        "Get your API key from: https://aistudio.google.com/apikey (Gemini API) " +
        "or https://console.cloud.google.com/ (Vertex AI)"
    );
  }
  return key;
}

function getModelId(): string {
  const model = process.env.GEMINI_MODEL;
  if (!model) {
    throw new Error(
      "GEMINI_MODEL environment variable is not set. " +
        "Add it to your .env or .env.local file (e.g. GEMINI_MODEL=gemini-3.1-flash-lite-preview)."
    );
  }
  return model;
}

export function getModel(): string {
  return getModelId();
}

/**
 * Lazily initialises and returns the GoogleGenAI client.
 *
 * Authentication priority:
 *   1. Service account OAuth2 — if GOOGLE_SERVICE_ACCOUNT_KEY is set, uses
 *      googleAuthOptions with the Generative Language API.
 *   2. API key — falls back to GEMINI_API_KEY with the Gemini Developer API.
 */
let _ai: GoogleGenAI | null = null;

function getOrCreateClient(): GoogleGenAI {
  if (!_ai) {
    const credentials = getServiceAccountCredentials();

    if (credentials) {
      // Generative Language API with service account OAuth2
      _ai = new GoogleGenAI({
        googleAuthOptions: {
          credentials,
          scopes: [
            "https://www.googleapis.com/auth/cloud-platform",
            "https://www.googleapis.com/auth/generative-language",
          ],
        },
      });
    } else {
      // Gemini Developer API — API key fallback
      console.warn(
        "GOOGLE_SERVICE_ACCOUNT_KEY is not set. " +
          "Falling back to API key authentication."
      );
      _ai = new GoogleGenAI({ apiKey: getApiKey() });
    }
  }

  return _ai;
}

/**
 * Returns the GoogleGenAI client instance.
 */
export function getGeminiClient() {
  return getOrCreateClient();
}

/**
 * Generates content using the configured Gemini model.
 * @param prompt - The text prompt to send
 */
export async function generateContent(
  prompt: string,
  customConfig?: Partial<typeof generationConfig>
) {
  const ai = getOrCreateClient();
  const response = await ai.models.generateContent({
    model: getModelId(),
    contents: prompt,
    config: {
      safetySettings,
      ...generationConfig,
      ...customConfig,
    },
  });
  return response;
}

/**
 * Creates a chat session with optional prior message history.
 * @param history - Array of previous messages in the conversation
 */
export function startChatSession(history: Content[] = []) {
  const ai = getOrCreateClient();
  return ai.chats.create({
    model: getModelId(),
    history,
    config: {
      safetySettings,
      ...generationConfig,
    },
  });
}
