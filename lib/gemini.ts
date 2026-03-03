import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  type Content,
} from "@google/generative-ai";

// Runtime check for API key
if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    "GEMINI_API_KEY environment variable is not set. Set GEMINI_API_KEY in your environment (for local development, you can use a .env or .env.local file).\n" +
      "Get your API key from: https://aistudio.google.com/apikey"
  );
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

const generationConfig = {
  temperature: 0.7,
  topP: 0.9,
  maxOutputTokens: 1024,
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  safetySettings,
  generationConfig,
});

/**
 * Returns the configured Gemini model instance.
 */
export function getGeminiModel() {
  return model;
}

/**
 * Creates a chat session with optional prior message history.
 * @param history - Array of previous messages in the conversation
 */
export function startChatSession(history: Content[] = []) {
  return model.startChat({
    history,
  });
}
