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
  maxOutputTokens: 1024,
};

export const MODEL_ID = process.env.GEMINI_MODEL || "gemini-3.1-pro-preview";

/**
 * Lazily initialises and returns the GoogleGenAI client.
 * Supports two modes:
 *   1. Vertex AI Express Mode — set GEMINI_API_KEY (Vertex AI API key)
 *      Uses vertexai: true + apiKey for Vertex AI Express.
 *   2. Gemini Developer API — set GEMINI_API_KEY (AI Studio key)
 *      Uses apiKey only for the Gemini Developer API.
 *
 * Set GOOGLE_GENAI_USE_VERTEXAI=true to switch to Vertex AI mode.
 */
let _ai: GoogleGenAI | null = null;

function getOrCreateClient(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY environment variable is not set. " +
          "Add it to your .env or .env.local file.\n" +
          "Get your API key from: https://aistudio.google.com/apikey (Gemini API) " +
          "or https://console.cloud.google.com/ (Vertex AI)"
      );
    }

    const useVertexAI = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true";

    if (useVertexAI) {
      // Vertex AI Express Mode — API key + vertexai flag
      _ai = new GoogleGenAI({
        vertexai: true,
        apiKey,
      });
    } else {
      // Gemini Developer API — API key only
      _ai = new GoogleGenAI({ apiKey });
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
    model: MODEL_ID,
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
    model: MODEL_ID,
    history,
    config: {
      safetySettings,
      ...generationConfig,
    },
  });
}
