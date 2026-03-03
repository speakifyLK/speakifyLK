import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type Content,
} from "@google/generative-ai";

/**
 * When set to '1', safety filters are disabled (BLOCK_NONE) in non-production
 * environments. In production, this override is ignored to avoid disabling
 * safety filters by accident. Otherwise, the default
 * BLOCK_MEDIUM_AND_ABOVE threshold is used.
 */
const isUnsafeModeEnv = process.env.GEMINI_UNSAFE_MODE === "1";
const isUnsafeMode =
  isUnsafeModeEnv && process.env.NODE_ENV !== "production";

if (isUnsafeModeEnv && process.env.NODE_ENV === "production") {
  console.warn(
    "GEMINI_UNSAFE_MODE=1 is set but ignored in production to prevent " +
      "disabling Gemini safety filters."
  );
}
const safetyThreshold = isUnsafeMode
  ? HarmBlockThreshold.BLOCK_NONE
  : HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE;

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: safetyThreshold,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: safetyThreshold,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: safetyThreshold,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: safetyThreshold,
  },
];

const generationConfig = {
  temperature: 0.7,
  topP: 0.9,
  maxOutputTokens: 1024,
};

/**
 * Lazily initialises and returns the Gemini GenerativeModel.
 * The model (and the API-key check) are deferred until the first
 * call, so the module can be imported safely even when the key
 * is not yet available (e.g. during build / lint).
 */
let _model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

function getOrCreateModel() {
  if (!_model) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY environment variable is not set. " +
          "Add it to your .env or .env.local file.\n" +
          "Get your API key from: https://aistudio.google.com/apikey"
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    _model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      safetySettings,
      generationConfig,
    });
  }
  return _model;
}

/**
 * Returns the configured Gemini model instance.
 */
export function getGeminiModel() {
  return getOrCreateModel();
}

/**
 * Creates a chat session with optional prior message history.
 * @param history - Array of previous messages in the conversation
 */
export function startChatSession(history: Content[] = []) {
  return getOrCreateModel().startChat({
    history,
  });
}
