/**
 * Structured prompt templates for AI-powered quiz question generation.
 *
 * Each template instructs Google Gemini to produce quiz questions in a
 * specific format (MULTIPLE_CHOICE, FILL_IN_BLANK, TRANSLATION).
 * All templates accept the same set of parameters so they can be called
 * uniformly from the quiz-generation API route.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of questions allowed per prompt */
const MAX_QUESTION_COUNT = 20;

/** Maximum allowed length for the topic string */
const MAX_TOPIC_LENGTH = 100;

/** Pattern for allowed topic characters (letters, numbers, spaces, hyphens, apostrophes) */
const SAFE_TOPIC_PATTERN = /^[\p{L}\p{N}\s'\-]+$/u;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuizType = "MULTIPLE_CHOICE" | "FILL_IN_BLANK" | "TRANSLATION";
export type Difficulty = "beginner" | "intermediate" | "advanced";

/** Context about what the user has already learned in the platform. */
export interface LearningContext {
  /** Lesson/topic names the user has fully completed */
  completedTopics: string[];
  /** Topics where the user scored below 50 % */
  weakTopics: string[];
  /** Topics where the user scored 80 %+ */
  strongTopics: string[];
  /** Sinhala words/phrases the user frequently gets wrong */
  frequentlyMissedWords: string[];
  /** Derived overall proficiency level */
  overallLevel: Difficulty;
}

export interface QuizPromptParams {
  /** Topic area, e.g. 'greetings', 'colours', 'numbers', 'food' */
  topic: string;
  /** Learner difficulty level */
  difficulty: Difficulty;
  /** Number of questions to generate */
  count: number;
  /** Optional – when provided, Gemini tailors questions to the learner */
  learningContext?: LearningContext;
  /**
   * Optional – pre-formatted RAG content chunks retrieved from the course
   * material. When supplied, prompts instruct Gemini to generate questions
   * exclusively from this content rather than using general knowledge.
   */
  ragContext?: string;
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

/** Max items per list to prevent token bloat */
const MAX_CONTEXT_LIST_ITEMS = 15;
/** Max length per individual item string */
const MAX_CONTEXT_ITEM_LENGTH = 80;

/**
 * Sanitise a single context string: strip control characters, collapse
 * whitespace, and truncate to a safe length.
 */
function sanitiseContextItem(raw: string): string {
  return raw
    .replace(/[\r\n\t]+/g, " ") // collapse newlines / tabs → space
    .replace(/[^\P{C}\s]/gu, "") // strip remaining control chars
    .trim()
    .slice(0, MAX_CONTEXT_ITEM_LENGTH);
}

/**
 * Sanitise and cap a list of context strings.
 */
function sanitiseContextList(items: string[]): string[] {
  return items
    .slice(0, MAX_CONTEXT_LIST_ITEMS)
    .map(sanitiseContextItem)
    .filter((s) => s.length > 0);
}

function buildLearningContextBlock(ctx: LearningContext | undefined): string {
  if (!ctx) return "";

  const completed = sanitiseContextList(ctx.completedTopics);
  const weak = sanitiseContextList(ctx.weakTopics);
  const strong = sanitiseContextList(ctx.strongTopics);
  const missed = sanitiseContextList(ctx.frequentlyMissedWords);

  const lines: string[] = [
    "",
    "PERSONALISATION — this learner's progress in the SpeakifyLK platform:",
  ];

  if (completed.length > 0) {
    lines.push(`- Topics they have completed: ${completed.join(", ")}.`);
  }
  if (weak.length > 0) {
    lines.push(`- Topics they STRUGGLE with (focus more questions here): ${weak.join(", ")}.`);
  }
  if (strong.length > 0) {
    lines.push(
      `- Topics they are STRONG in (include a few review questions): ${strong.join(", ")}.`
    );
  }
  if (missed.length > 0) {
    lines.push(
      `- Words they frequently get wrong (try to include some of these): ${missed.join(", ")}.`
    );
  }
  lines.push(`- Overall proficiency level: ${ctx.overallLevel}.`);
  lines.push("");
  lines.push(
    "Use the information above to personalise the questions. " +
      "Only use vocabulary and concepts from topics the learner has already studied. " +
      "Prioritise their weak areas so they can improve."
  );

  return lines.join("\n");
}

/**
 * Build the RAG context block that is prepended to prompts when course
 * content chunks are available.  The block instructs Gemini to restrict
 * question generation to the provided sources and formats the raw
 * `ragContext` string for clarity.
 */
function buildRagContextBlock(ragContext: string | undefined): string {
  if (!ragContext) return "";

  const lines: string[] = [
    "",
    "COURSE CONTENT — Use ONLY the following course content to generate questions. Do not use general knowledge.",
    "",
    ragContext,
    "",
    "IMPORTANT: Each question MUST reference specific content from the sources above. " +
      "Do not invent facts, vocabulary, or sentences that are not present in the provided content.",
  ];

  return lines.join("\n");
}

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
  const { topic, difficulty, count, learningContext, ragContext } = params;

  return `
You are a Sinhala language quiz generator for the "SpeakifyLK" learning platform.

Generate exactly ${count} MULTIPLE-CHOICE question(s) about the topic "${topic}".

Difficulty level: ${difficulty}
${difficultyGuidelines[difficulty]}
${buildLearningContextBlock(learningContext)}
${buildRagContextBlock(ragContext)}

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
 *   "answer": "...",
 *   "hint": "...",
 *   "explanation": "..."
 * }
 * ```
 */
function buildFillInBlankPrompt(params: QuizPromptParams): string {
  const { topic, difficulty, count, learningContext, ragContext } = params;

  return `
You are a Sinhala language quiz generator for the "SpeakifyLK" learning platform.

Generate exactly ${count} FILL-IN-THE-BLANK question(s) about the topic "${topic}".

Difficulty level: ${difficulty}
${difficultyGuidelines[difficulty]}
${buildLearningContextBlock(learningContext)}
${buildRagContextBlock(ragContext)}

For each question, respond with an object that has:
- "sentence": A Sinhala sentence with a blank represented by "___" where the missing word should be (string).
- "answer": The correct Sinhala word that fills the blank (string).
- "hint": A short English hint to help the learner guess the answer (string).
- "explanation": A brief English explanation of the correct answer and any relevant grammar (string).

${JSON_INSTRUCTION}

Example response format:
[
  {
    "sentence": "මම ___ යනවා. (mama ___ yanawaa.)",
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
  const { topic, difficulty, count, learningContext, ragContext } = params;

  const ragVocabInstruction = ragContext
    ? "\nIMPORTANT: The source and target text for each translation MUST come from actual vocabulary " +
      "found in the provided course content. Do not invent words or phrases that are not in the sources.\n"
    : "";

  return `
You are a Sinhala language quiz generator for the "SpeakifyLK" learning platform.

Generate exactly ${count} TRANSLATION question(s) about the topic "${topic}".

Difficulty level: ${difficulty}
${difficultyGuidelines[difficulty]}
${buildLearningContextBlock(learningContext)}
${buildRagContextBlock(ragContext)}
${ragVocabInstruction}
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

/** Map of quiz type to its prompt builder (Map avoids prototype-chain lookups) */
const promptBuilders = new Map<QuizType, (params: QuizPromptParams) => string>([
  ["MULTIPLE_CHOICE", buildMultipleChoicePrompt],
  ["FILL_IN_BLANK", buildFillInBlankPrompt],
  ["TRANSLATION", buildTranslationPrompt],
]);

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
export function buildQuizPrompt(type: QuizType, params: QuizPromptParams): string {
  // --- Validate count ---
  if (!Number.isInteger(params.count) || params.count < 1) {
    throw new Error(`"count" must be a positive integer, received: ${params.count}`);
  }
  if (params.count > MAX_QUESTION_COUNT) {
    throw new Error(`"count" must not exceed ${MAX_QUESTION_COUNT}, received: ${params.count}`);
  }

  // --- Validate & sanitise topic ---
  const trimmedTopic = params.topic.trim();
  if (trimmedTopic.length === 0) {
    throw new Error('"topic" must not be empty.');
  }
  if (trimmedTopic.length > MAX_TOPIC_LENGTH) {
    throw new Error(
      `"topic" must not exceed ${MAX_TOPIC_LENGTH} characters, received ${trimmedTopic.length}.`
    );
  }
  if (!SAFE_TOPIC_PATTERN.test(trimmedTopic)) {
    throw new Error(
      '"topic" contains invalid characters. Only letters, numbers, spaces, hyphens, and apostrophes are allowed.'
    );
  }

  const sanitisedParams: QuizPromptParams = {
    ...params,
    topic: trimmedTopic,
  };

  if (!promptBuilders.has(type)) {
    throw new Error(
      `Unknown quiz type "${type}". Expected one of: ${[...promptBuilders.keys()].join(", ")}`
    );
  }
  const builder = promptBuilders.get(type)!;
  return builder(sanitisedParams);
}
