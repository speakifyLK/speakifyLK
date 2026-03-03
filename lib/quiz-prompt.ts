/**
 * Structured prompt templates for AI-powered quiz question generation.
 *
 * Each template instructs Google Gemini to produce quiz questions in a
 * specific format (MULTIPLE_CHOICE, FILL_IN_BLANK, TRANSLATION).
 * All templates accept the same set of parameters so they can be called
 * uniformly from the quiz-generation API route.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuizType = "MULTIPLE_CHOICE" | "FILL_IN_BLANK" | "TRANSLATION";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface QuizPromptParams {
  /** Topic area, e.g. 'greetings', 'colours', 'numbers', 'food' */
  topic: string;
  /** Learner difficulty level */
  difficulty: Difficulty;
  /** Number of questions to generate */
  count: number;
}

// ---------------------------------------------------------------------------
// Shared preamble appended to every prompt
// ---------------------------------------------------------------------------

const JSON_INSTRUCTION = `
CRITICAL INSTRUCTIONS:
- Return ONLY valid JSON. Do NOT wrap the output in markdown code fences or add any text before/after the JSON.
- Do NOT include backticks, \`\`\`json markers, or any explanation outside the JSON array.
- The root of your response MUST be a JSON array: [ ... ]
- Every string value must use proper JSON escaping.
`;

const difficultyGuidelines: Record<Difficulty, string> = {
  beginner:
    "Use very simple, common Sinhala vocabulary and short sentences. " +
    "Provide romanized transliteration in parentheses for all Sinhala text. " +
    'Example: "ආයුබෝවන් (aayubowan)".',
  intermediate:
    "Use moderately complex Sinhala vocabulary and compound sentences. " +
    "Include transliteration only for uncommon words.",
  advanced:
    "Use formal, complex Sinhala vocabulary with idiomatic expressions. " +
    "Do not include transliteration.",
};

// ---------------------------------------------------------------------------
// Template builders
// ---------------------------------------------------------------------------

/**
 * MULTIPLE_CHOICE
 *
 * Expected response shape per item:
 * ```json
 * {
 *   "question": "...",
 *   "options": [
 *     { "text": "...", "isCorrect": true/false },
 *     ...
 *   ],
 *   "explanation": "..."
 * }
 * ```
 */
function buildMultipleChoicePrompt(params: QuizPromptParams): string {
  const { topic, difficulty, count } = params;

  return `
You are a Sinhala language quiz generator for the "SpeakifyLK" learning platform.

Generate exactly ${count} MULTIPLE-CHOICE question(s) about the topic "${topic}".

Difficulty level: ${difficulty}
${difficultyGuidelines[difficulty]}

For each question, respond with an object that has:
- "question": A clear Sinhala-language question (string).
- "options": An array of exactly 4 option objects, each with:
    - "text": The answer option text (string).
    - "isCorrect": Boolean, true for the single correct answer, false for the rest.
- "explanation": A brief English explanation of why the correct answer is correct (string).

Exactly one option per question must have "isCorrect": true.

${JSON_INSTRUCTION}

Example response format:
[
  {
    "question": "What is the Sinhala word for 'Hello'?",
    "options": [
      { "text": "ආයුබෝවන් (aayubowan)", "isCorrect": true },
      { "text": "ස්තූතියි (sthuthiyi)", "isCorrect": false },
      { "text": "නැහැ (naehae)", "isCorrect": false },
      { "text": "ඔව් (ov)", "isCorrect": false }
    ],
    "explanation": "'ආයුබෝවන්' (aayubowan) is the traditional Sinhala greeting meaning 'Hello' or 'May you live long'."
  }
]
`.trim();
}

/**
 * FILL_IN_BLANK
 *
 * Expected response shape per item:
 * ```json
 * {
 *   "sentence": "...",
 *   "blank": "___",
 *   "answer": "...",
 *   "hint": "...",
 *   "explanation": "..."
 * }
 * ```
 */
function buildFillInBlankPrompt(params: QuizPromptParams): string {
  const { topic, difficulty, count } = params;

  return `
You are a Sinhala language quiz generator for the "SpeakifyLK" learning platform.

Generate exactly ${count} FILL-IN-THE-BLANK question(s) about the topic "${topic}".

Difficulty level: ${difficulty}
${difficultyGuidelines[difficulty]}

For each question, respond with an object that has:
- "sentence": A Sinhala sentence with a blank represented by "___" where the missing word should be (string).
- "blank": The literal string "___" indicating where the answer goes (string).
- "answer": The correct Sinhala word that fills the blank (string).
- "hint": A short English hint to help the learner guess the answer (string).
- "explanation": A brief English explanation of the correct answer and any relevant grammar (string).

${JSON_INSTRUCTION}

Example response format:
[
  {
    "sentence": "මම ___ යනවා. (mama ___ yanawaa.)",
    "blank": "___",
    "answer": "පාසලට (paasalata)",
    "hint": "A place where students go to study.",
    "explanation": "'පාසලට' means 'to school'. The suffix '-ට' (-ta) indicates direction/destination in Sinhala."
  }
]
`.trim();
}

/**
 * TRANSLATION
 *
 * Expected response shape per item:
 * ```json
 * {
 *   "sourceText": "...",
 *   "sourceLanguage": "sinhala" | "english",
 *   "correctTranslation": "...",
 *   "acceptableAlternatives": ["..."],
 *   "explanation": "..."
 * }
 * ```
 */
function buildTranslationPrompt(params: QuizPromptParams): string {
  const { topic, difficulty, count } = params;

  return `
You are a Sinhala language quiz generator for the "SpeakifyLK" learning platform.

Generate exactly ${count} TRANSLATION question(s) about the topic "${topic}".

Difficulty level: ${difficulty}
${difficultyGuidelines[difficulty]}

Mix the translation direction: some questions should be Sinhala-to-English, others English-to-Sinhala.

For each question, respond with an object that has:
- "sourceText": The text the learner must translate (string).
- "sourceLanguage": Either "sinhala" or "english" indicating the language of sourceText (string).
- "correctTranslation": The primary correct translation (string).
- "acceptableAlternatives": An array of alternative correct translations (string[]). May be empty.
- "explanation": A brief English explanation covering vocabulary, grammar, or nuance (string).

${JSON_INSTRUCTION}

Example response format:
[
  {
    "sourceText": "ආයුබෝවන්",
    "sourceLanguage": "sinhala",
    "correctTranslation": "Hello",
    "acceptableAlternatives": ["Greetings", "Welcome"],
    "explanation": "'ආයුබෝවන්' (aayubowan) literally means 'May you live long' and is used as a greeting in Sinhala."
  },
  {
    "sourceText": "Thank you",
    "sourceLanguage": "english",
    "correctTranslation": "ස්තූතියි (sthuthiyi)",
    "acceptableAlternatives": ["බොහොම ස්තූතියි (bohoma sthuthiyi)"],
    "explanation": "'ස්තූතියි' is the standard way to say 'Thank you'. 'බොහොම ස්තූතියි' means 'Thank you very much'."
  }
]
`.trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Map of quiz type to its prompt builder */
const promptBuilders: Record<
  QuizType,
  (params: QuizPromptParams) => string
> = {
  MULTIPLE_CHOICE: buildMultipleChoicePrompt,
  FILL_IN_BLANK: buildFillInBlankPrompt,
  TRANSLATION: buildTranslationPrompt,
};

/**
 * Returns a fully-formed prompt string for the given quiz type and parameters.
 *
 * @example
 * ```ts
 * import { buildQuizPrompt } from "@/lib/quiz-prompt";
 *
 * const prompt = buildQuizPrompt("MULTIPLE_CHOICE", {
 *   topic: "greetings",
 *   difficulty: "beginner",
 *   count: 5,
 * });
 * ```
 */
export function buildQuizPrompt(
  type: QuizType,
  params: QuizPromptParams
): string {
  const builder = promptBuilders[type];
  if (!builder) {
    throw new Error(
      `Unknown quiz type "${type}". Expected one of: ${Object.keys(promptBuilders).join(", ")}`
    );
  }
  return builder(params);
}
