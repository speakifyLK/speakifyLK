#!/usr/bin/env node
/**
 * SpeakifyLK — Jira AI Feature Seed Script
 * Creates 3 Epics and 30 Tasks (with detailed descriptions, dates,
 * priorities, story points, assignees, and labels).
 *
 * Usage:
 *   JIRA_API_TOKEN=your_token node scripts/jira-ai-seed.js
 */

const JIRA_BASE_URL  = "https://speakifylk.atlassian.net";
const JIRA_EMAIL     = "desilvabethmin@gmail.com";
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const PROJECT_KEY    = "SPEAKLK";
const BOARD_ID       = 14;

if (!JIRA_API_TOKEN) {
  console.error("❌  JIRA_API_TOKEN env var is required.");
  console.error("    Run: JIRA_API_TOKEN=your_token node scripts/jira-ai-seed.js");
  process.exit(1);
}

const AUTH    = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");
const headers = { Authorization: `Basic ${AUTH}`, Accept: "application/json", "Content-Type": "application/json" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function jira(method, path, body) {
  const res  = await fetch(`${JIRA_BASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const adf   = (text) => ({ version: 1, type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

// ─── Team ─────────────────────────────────────────────────────────────────────
const TEAM = {
  januda:    "desilvabethmin@gmail.com",  // Januda Bethmin  — Lead / DevOps / Stripe / Jira
  thevindu:  "thevindukevin@gmail.com",   // Thevindu Kevin  — Frontend / Auth / Admin / Marketing
  sandalika: "sandalika24@gmail.com",     // Sandalika Liyanage — Infra / DB / CI/CD
  supuni:    "supuniab1@gmail.com",       // Supuni Abeysinghe  — Frontend / Gamification
  naduni:    "nadutash0@gmail.com",       // Naduni Tashana  — DB / Frontend / Bugs / Admin
};

// ─── Priority map ─────────────────────────────────────────────────────────────
const P = { P1: "Highest", P2: "High", P3: "Low", P4: "Lowest" };

// ─── Epics ────────────────────────────────────────────────────────────────────
const EPICS = [
  { id: "E11", assignee: "sandalika", points: 24,
    summary: "Sinhala AI Conversational Assistant",
    desc: "AI-powered Sinhala conversational chatbot integrated into the SpeakifyLK learning platform using Google Gemini. Enables learners to practice Sinhala through interactive real-time conversations, receive grammar corrections with explanations, get vocabulary help with transliterations, and obtain contextual translations — all adapted to the user's current course progress and proficiency level." },

  { id: "E12", assignee: "thevindu", points: 24,
    summary: "AI-Powered Adaptive Quiz Engine",
    desc: "Gemini-powered dynamic quiz generation system that creates adaptive quiz questions based on lesson content and user proficiency. Supports multiple question types including multiple-choice, fill-in-the-blank, and Sinhala-to-English translation. Features AI-generated explanations for wrong answers, adaptive difficulty progression, XP rewards, and comprehensive performance analytics." },

  { id: "E13", assignee: "januda", points: 12,
    summary: "CI/CD, DevOps, Infrastructure & Deployment",
    desc: "End-to-end CI/CD pipeline setup, DevOps automation, production infrastructure configuration, and deployment management for all AI features. Covers GitHub Actions workflows for chatbot and quiz feature branches, Vercel production deployment optimisation, NeonDB connection pooling, Gemini API secrets management, application monitoring and error logging, database migration automation, and end-to-end smoke testing. Tasks for this epic will be added at runtime." },
];

// ─── Tasks ────────────────────────────────────────────────────────────────────
// epic, assignee, priority (P1-P4), points, startDate, dueDate, summary, desc
const TASKS = [

  // ══════════════════════════════════════════════════════════════════════════════
  //  E11 — SINHALA AI CONVERSATIONAL ASSISTANT (15 tasks, 24 pts)
  //  Assignees: Sandalika (Infra/DB) + Naduni (DB/Frontend)
  // ══════════════════════════════════════════════════════════════════════════════

  // ── Sprint 5 — Backend & Foundation (Mar 3–9) ──────────────────────────────

  // Sandalika — Backend infrastructure
  { epic: "E11", assignee: "sandalika", priority: "P1", points: 1,
    startDate: "2026-03-03", dueDate: "2026-03-03",
    summary: "Install Google Generative AI SDK and create Gemini client utility",
    desc: "Install the @google/generative-ai package via bun. Add GEMINI_API_KEY to .env.local with the project's Google AI Studio API key. Add the GEMINI_API_KEY type declaration in environment.d.ts for TypeScript autocomplete. Create lib/gemini.ts as the shared Gemini client utility: import GoogleGenerativeAI from the SDK, initialise it with process.env.GEMINI_API_KEY, configure the gemini-2.0-flash model with safety settings (block none for educational content) and generation config (temperature 0.7, topP 0.9, maxOutputTokens 1024). Export a getGeminiModel() function that returns the configured model instance and a startChatSession(history) helper that creates a chat session with prior message history. Add a runtime check that throws a clear error if GEMINI_API_KEY is missing. Verify the client works by running a simple test prompt locally." },

  { epic: "E11", assignee: "sandalika", priority: "P1", points: 2,
    startDate: "2026-03-03", dueDate: "2026-03-04",
    summary: "Design chatbot database schema with Drizzle ORM",
    desc: "Create two new tables in db/schema.ts using Drizzle ORM. The chatConversations table stores id (serial primary key), userId (text, references Clerk user ID), title (text, auto-generated from first message), language (text, default 'sinhala'), createdAt and updatedAt timestamps. The chatMessages table stores id (serial primary key), conversationId (integer, foreign key to chatConversations), role (enum: 'user' or 'assistant'), content (text), timestamp. Define proper relations using Drizzle's relations() API linking conversations to messages (one-to-many) and conversations to userProgress via userId." },

  { epic: "E11", assignee: "sandalika", priority: "P2", points: 1,
    startDate: "2026-03-05", dueDate: "2026-03-05",
    summary: "Push chatbot schema to NeonDB and verify tables",
    desc: "Run bun db:push to synchronise the new chatConversations and chatMessages tables to the NeonDB serverless PostgreSQL database. Open Drizzle Studio via bun db:studio and verify both tables are created with correct column types, constraints, and foreign key relationships. Confirm the foreign key from chatConversations.userId correctly references the existing userProgress table's userId column." },

  { epic: "E11", assignee: "sandalika", priority: "P1", points: 2,
    startDate: "2026-03-05", dueDate: "2026-03-07",
    summary: "Create chat database query functions in db/queries.ts",
    desc: "Add the following query functions to db/queries.ts following the existing caching pattern with the cache() wrapper: getConversations(userId) — returns all conversations for a user ordered by updatedAt descending; getConversationById(conversationId) — returns a single conversation with all its messages ordered by timestamp ascending; getMessagesByConversation(conversationId, limit, offset) — returns paginated messages for infinite scroll support. Each query should use Drizzle's relational query API with proper where clauses and orderBy." },

  // Naduni — System prompt & server actions
  { epic: "E11", assignee: "naduni", priority: "P1", points: 2,
    startDate: "2026-03-03", dueDate: "2026-03-04",
    summary: "Build Sinhala tutor system prompt template",
    desc: "Create a lib/chat-prompt.ts file containing a detailed system prompt string that instructs Google Gemini to act as a friendly Sinhala language tutor named 'SpeakifyLK Assistant'. The prompt should instruct the model to: (1) Always respond in Sinhala script with romanised transliterations in parentheses, e.g. 'ආයුබෝවන් (aayubowan)'; (2) Correct any grammar mistakes the user makes and explain the correction in simple English; (3) Introduce new vocabulary relevant to the conversation topic; (4) Adapt response complexity based on detected user proficiency — use simple sentences for beginners and more complex structures for advanced learners; (5) Occasionally ask practice questions to reinforce learning; (6) Keep responses concise (2-3 sentences) to maintain conversational flow." },

  { epic: "E11", assignee: "naduni", priority: "P1", points: 2,
    startDate: "2026-03-05", dueDate: "2026-03-07",
    summary: "Create chat server actions for CRUD operations",
    desc: "Build server actions in actions/chat.ts following the existing pattern from actions/challenge-progress.ts. Implement: createConversation() — creates a new chatConversation record for the authenticated Clerk user and returns the conversationId; sendMessage(conversationId, content) — inserts a new user message into chatMessages and returns the message record; saveAssistantMessage(conversationId, content) — inserts the assistant's response into chatMessages; deleteConversation(conversationId) — deletes a conversation and all its messages with a cascading delete; getOrCreateConversation() — returns the user's most recent conversation or creates a new one. All actions must use auth() from @clerk/nextjs for authentication and revalidatePath('/chat') for cache invalidation." },

  { epic: "E11", assignee: "naduni", priority: "P1", points: 1,
    startDate: "2026-03-07", dueDate: "2026-03-08",
    summary: "Build ChatBubble component for user and bot messages",
    desc: "Create components/chat/chat-bubble.tsx as a React component that renders a single chat message. Accept props: role ('user' | 'assistant'), content (string), timestamp (Date). User messages render right-aligned with a green-500 background and white text. Assistant messages render left-aligned with a gray-100 background and dark text, preceded by a small bot avatar icon. Display Sinhala text with the Noto Sans Sinhala font if available, falling back to the system default. Show a formatted timestamp below each bubble (e.g., '2:30 PM'). Apply rounded-2xl corners with rounded-br-sm for user and rounded-bl-sm for assistant bubbles." },

  { epic: "E11", assignee: "naduni", priority: "P1", points: 1,
    startDate: "2026-03-08", dueDate: "2026-03-09",
    summary: "Build ChatInput component with send button",
    desc: "Create components/chat/chat-input.tsx with a text input field and send button. The input should have a placeholder 'Type your message in Sinhala or English...' and support both Enter key and button click to submit. Disable the input and show a pulsing animation on the send button while the bot is generating a response (accept an isLoading prop). The send button uses the lucide-react SendHorizontal icon. Apply a sticky bottom positioning with a white background and subtle top border shadow. Prevent empty message submission." },

  // ── Sprint 6 — API, Features & Polish (Mar 10–16) ─────────────────────────

  // Sandalika — API routes
  { epic: "E11", assignee: "sandalika", priority: "P1", points: 3,
    startDate: "2026-03-10", dueDate: "2026-03-12",
    summary: "Create /api/chat streaming API route with Gemini",
    desc: "Implement app/api/chat/route.ts as a Next.js Route Handler that handles POST requests. The route should: (1) Authenticate the user via auth() from @clerk/nextjs and return 401 if unauthenticated; (2) Parse the request body for conversationId and message content; (3) Save the user's message to the database via sendMessage(conversationId, content) so it is persisted before generating the response; (4) Load the full conversation message history from the database using getMessagesByConversation(); (5) Import the system prompt from lib/chat-prompt.ts; (6) Initialise the Gemini client using getGeminiModel() from lib/gemini.ts; (7) Call model.generateContentStream() passing the system prompt and conversation history formatted as Gemini's {role, parts} structure; (8) Return a streaming response using new ReadableStream() that pipes each chunk's text() to the client and accumulates the full response in a buffer; (9) After streaming completes, save the full assistant response to the database via saveAssistantMessage(conversationId, fullResponse). Handle Gemini API errors gracefully and return structured JSON error responses with appropriate HTTP status codes." },

  { epic: "E11", assignee: "sandalika", priority: "P2", points: 2,
    startDate: "2026-03-13", dueDate: "2026-03-14",
    summary: "Add conversation context injection from active course",
    desc: "Enhance the /api/chat route to inject course context into the Gemini prompt. Before calling generateContentStream(), query the user's activeCourseId from userProgress, then fetch the active course title, current unit title, and the most recent 3 completed lesson titles using existing query functions from db/queries.ts. Append this context to the system prompt as: 'The student is currently studying [Course Title], in [Unit Title]. They recently completed lessons on: [Lesson 1], [Lesson 2], [Lesson 3]. Tailor your responses to reinforce vocabulary and grammar from these topics.' This ensures the chatbot responses are directly relevant to what the learner is actively studying." },

  { epic: "E11", assignee: "sandalika", priority: "P2", points: 1,
    startDate: "2026-03-15", dueDate: "2026-03-16",
    summary: "Implement rate limiting and error handling for chat API",
    desc: "Add per-user rate limiting to the /api/chat route. Implement an in-memory rate limiter using a Map<userId, {count, resetTime}> that allows 20 messages per hour for free users and unlimited messages for users with an active Stripe subscription (check via getUserSubscription() from db/queries.ts). When the limit is exceeded, return a 429 Too Many Requests response with a JSON body containing the remaining wait time. Add structured error handling for: Gemini API failures (503), invalid request body (400), authentication failures (401), and rate limit exceeded (429). Log all Gemini API errors with the userId and timestamp for monitoring." },

  // Naduni — Frontend UI
  { epic: "E11", assignee: "naduni", priority: "P1", points: 2,
    startDate: "2026-03-10", dueDate: "2026-03-11",
    summary: "Build ChatWindow container with streaming message display",
    desc: "Create components/chat/chat-window.tsx as the main chat container that composes ChatBubble and ChatInput components. Implement: (1) A scrollable message list that auto-scrolls to the bottom when new messages arrive using a useRef on the container with scrollIntoView({behavior: 'smooth'}); (2) A typing indicator (three animated dots) that displays while the assistant is generating a response; (3) An empty state with an illustration and 'Start a conversation in Sinhala!' message when no messages exist; (4) A header showing the conversation title with a back/close button. The component should accept initialMessages as a prop for server-rendered message history and manage new messages in local state during the session. Connect to the /api/chat endpoint using streaming fetch — when the user sends a message: call the sendMessage() server action to persist the user message to the database, append it to the local list, then call fetch('/api/chat') and read the response as a ReadableStream using response.body.getReader(). Decode chunks with TextDecoder and append tokens to the assistant bubble in real-time. On stream completion, the API route saves the assistant response to the database. Handle fetch errors with a Sonner toast and retry button." },

  { epic: "E11", assignee: "naduni", priority: "P1", points: 2,
    startDate: "2026-03-12", dueDate: "2026-03-13",
    summary: "Create /chat page route under main layout",
    desc: "Add app/(main)/chat/page.tsx as a new protected route within the authenticated main layout. The page component should be an async server component that: (1) Fetches the authenticated user via auth() and redirects to /sign-in if unauthenticated; (2) Fetches the user's conversation list and active conversation messages using the query functions from db/queries.ts; (3) Fetches userProgress for the XP/hearts display in the sidebar; (4) Renders the ChatWindow component with the fetched messages as initial data. Follow the same data-fetching pattern used in app/(main)/learn/page.tsx with parallel Promise.all() for multiple queries. Include proper loading.tsx and error.tsx boundary files." },

  { epic: "E11", assignee: "naduni", priority: "P2", points: 1,
    startDate: "2026-03-14", dueDate: "2026-03-14",
    summary: "Add chat navigation item to sidebar",
    desc: "Add a 'Chat' navigation link to the existing components/sidebar.tsx component and the mobile navigation sheet. Use the lucide-react MessageCircle icon. Position the Chat link between the existing Learn and Leaderboard navigation items. Apply the same active state styling pattern (green background on the active route) used by other sidebar links. Update the SidebarItem component's href to '/chat'. Ensure the mobile sheet navigation (components/mobile-header.tsx) also includes the Chat link with identical styling and icon." },

  { epic: "E11", assignee: "naduni", priority: "P1", points: 1,
    startDate: "2026-03-15", dueDate: "2026-03-16",
    summary: "Build conversation list panel with create, switch, and delete",
    desc: "Create components/chat/conversation-list.tsx as a sidebar panel (collapsible on mobile) that displays the user's past conversations. Render each conversation as a clickable row showing the auto-generated title (first user message truncated to 40 chars) and a relative timestamp (e.g., '2 hours ago'). Clicking a conversation calls router.push('/chat?id=conversationId') and loads its message history into ChatWindow. Add a 'New Chat' button at the top that calls the createConversation() server action, clears the ChatWindow, and starts a fresh session. Add a delete button (trash icon) on each conversation row that calls deleteConversation() with a confirmation dialog using the existing ShadCN Dialog component. Highlight the currently active conversation with a green left border. Show a 'No conversations yet' empty state when the list is empty." },

  // ══════════════════════════════════════════════════════════════════════════════
  //  E12 — AI-POWERED ADAPTIVE QUIZ ENGINE (15 tasks, 24 pts)
  //  Assignees: Thevindu (Frontend/Auth) + Supuni (Frontend/Gamification)
  // ══════════════════════════════════════════════════════════════════════════════

  // ── Sprint 5 — Backend & Foundation (Mar 3–9) ──────────────────────────────

  // Thevindu — Prompts, schema, API
  { epic: "E12", assignee: "thevindu", priority: "P1", points: 2,
    startDate: "2026-03-03", dueDate: "2026-03-04",
    summary: "Design Gemini prompt templates for quiz question generation",
    desc: "Create a lib/quiz-prompt.ts file containing structured prompt templates that instruct Google Gemini to generate quiz questions in three formats. (1) MULTIPLE_CHOICE: Generate a question with 4 answer options in JSON format {question, options: [{text, isCorrect}], explanation}. (2) FILL_IN_BLANK: Generate a Sinhala sentence with a blank and the correct answer {sentence, blank, answer, hint, explanation}. (3) TRANSLATION: Generate a Sinhala-to-English or English-to-Sinhala translation prompt {sourceText, sourceLanguage, correctTranslation, acceptableAlternatives, explanation}. Each template should accept parameters for topic (e.g., 'greetings', 'colours'), difficulty ('beginner', 'intermediate', 'advanced'), and count (number of questions). Include instructions for Gemini to return valid JSON only, with no markdown formatting." },

  { epic: "E12", assignee: "thevindu", priority: "P1", points: 2,
    startDate: "2026-03-03", dueDate: "2026-03-04",
    summary: "Design AI quiz database schema with Drizzle ORM",
    desc: "Create two new tables in db/schema.ts using Drizzle ORM for the AI quiz feature. The aiQuizSessions table stores: id (serial primary key), userId (text, Clerk user ID), topic (text, the quiz subject e.g. 'Unit 1 - Greetings'), difficulty (text, enum: 'beginner'/'intermediate'/'advanced'), totalQuestions (integer), correctAnswers (integer, default 0), score (integer, percentage 0-100), startedAt (timestamp), completedAt (timestamp, nullable), courseId (integer, foreign key to courses). The aiQuizQuestions table stores: id (serial primary key), sessionId (integer, foreign key to aiQuizSessions), type (text, enum: 'mcq'/'fill_blank'/'translation'), question (text, the question or prompt), options (json, nullable — for MCQ options array), correctAnswer (text), userAnswer (text, nullable), isCorrect (boolean, nullable), explanation (text — AI-generated explanation), order (integer). Define Drizzle relations linking sessions to questions (one-to-many) and sessions to courses." },

  { epic: "E12", assignee: "thevindu", priority: "P2", points: 1,
    startDate: "2026-03-05", dueDate: "2026-03-05",
    summary: "Push AI quiz schema to NeonDB and verify tables",
    desc: "Run bun db:push to synchronise the new aiQuizSessions and aiQuizQuestions tables to the NeonDB PostgreSQL database. Open Drizzle Studio via bun db:studio and verify both tables are created with correct column types, constraints, default values, and foreign key relationships. Confirm the foreign key from aiQuizSessions.courseId to courses.id and from aiQuizQuestions.sessionId to aiQuizSessions.id are working correctly. Test inserting and querying a sample record to verify the schema works end-to-end." },

  { epic: "E12", assignee: "thevindu", priority: "P1", points: 2,
    startDate: "2026-03-06", dueDate: "2026-03-09",
    summary: "Create /api/quiz/generate API route with Gemini",
    desc: "Implement app/api/quiz/generate/route.ts as a Next.js Route Handler. The route should: (1) Authenticate via auth() and return 401 if unauthenticated; (2) Parse request body for topic (string), difficulty ('beginner'/'intermediate'/'advanced'), questionCount (number, 5-15), and questionTypes (array of 'mcq'/'fill_blank'/'translation'); (3) Build the Gemini prompt using the templates from lib/quiz-prompt.ts with the provided parameters; (4) Call the Gemini model.generateContent() (non-streaming, since we need the full JSON response); (5) Parse the JSON response and validate it contains the expected question structure; (6) Create a new aiQuizSession record in the database; (7) Insert all generated questions into aiQuizQuestions with the sessionId; (8) Return the session ID and parsed questions array as JSON. Include retry logic (up to 2 retries) if Gemini returns malformed JSON." },

  // Supuni — Server actions, state, UI
  { epic: "E12", assignee: "supuni", priority: "P1", points: 2,
    startDate: "2026-03-05", dueDate: "2026-03-07",
    summary: "Create AI quiz server actions and database queries",
    desc: "Build server actions in actions/quiz.ts and query functions in db/queries.ts. Server actions: createQuizSession(topic, difficulty, courseId) — creates a new aiQuizSession and returns the session record; submitQuizAnswer(questionId, userAnswer) — updates the aiQuizQuestions record with the user's answer and determines correctness. For MCQ questions, compare the selected option text to correctAnswer directly. For FILL_IN_BLANK and TRANSLATION types, implement fuzzy matching: normalise both strings (trim, lowercase, remove extra spaces and punctuation), then check against the correctAnswer and the acceptableAlternatives array stored in the options JSON field — mark as correct if any alternative matches within a Levenshtein distance of 2 or if the normalised strings are equal. Update the session's correctAnswers count on each correct submission. completeQuizSession(sessionId) — calculates the final score percentage, sets completedAt timestamp, and awards XP points to userProgress. Query functions: getQuizHistory(userId) — returns the user's last 20 quiz sessions with score and topic; getQuizSessionWithQuestions(sessionId) — returns a session with all its questions for the review screen; getQuizStats(userId) — returns aggregate statistics (total quizzes, average score, favourite topic, improvement trend)." },

  { epic: "E12", assignee: "supuni", priority: "P2", points: 1,
    startDate: "2026-03-03", dueDate: "2026-03-03",
    summary: "Create Zustand store for AI quiz state management",
    desc: "Create store/quiz-store.ts using Zustand following the existing modal store pattern in store/. The store should manage: currentSessionId (number | null), currentQuestionIndex (number), questions (array of quiz question objects), selectedAnswer (string | null), isAnswerSubmitted (boolean), score (number), timeRemaining (number, seconds), isQuizActive (boolean), difficulty (string). Implement actions: startQuiz(sessionId, questions), selectAnswer(answer), submitAnswer(), nextQuestion(), completeQuiz(), resetQuiz(), decrementTimer(). Export the useQuizStore hook for component consumption." },

  { epic: "E12", assignee: "supuni", priority: "P1", points: 2,
    startDate: "2026-03-04", dueDate: "2026-03-06",
    summary: "Build quiz topic and difficulty selection UI",
    desc: "Create components/quiz/quiz-config.tsx as the quiz setup screen. Display: (1) A topic selector grid showing available topics based on the user's active course units — each unit appears as a clickable card with the unit title and number of available lessons; (2) A difficulty picker with three large buttons: Beginner (green, 'Simple vocabulary and basic phrases'), Intermediate (yellow, 'Sentence construction and grammar'), Advanced (red, 'Complex conversations and idioms'); (3) A question count selector with options 5, 10, and 15; (4) Question type checkboxes for MCQ, Fill-in-the-blank, and Translation (all selected by default); (5) A prominent 'Start Quiz' button that calls the /api/quiz/generate endpoint and transitions to the quiz screen. Use Tailwind CSS styling consistent with the existing SpeakifyLK design system." },

  { epic: "E12", assignee: "supuni", priority: "P2", points: 1,
    startDate: "2026-03-07", dueDate: "2026-03-09",
    summary: "Build quiz timer and progress bar component",
    desc: "Create components/quiz/quiz-progress.tsx that displays quiz progress information. Include: (1) A countdown timer showing seconds remaining for the current question (30 seconds for beginner, 20 for intermediate, 15 for advanced) using the existing react-circular-progressbar library with a circular countdown animation; (2) A horizontal progress bar showing current question number out of total (e.g., 'Question 3 of 10') using the ShadCN Progress component; (3) A score indicator showing current correct answers; (4) Timer colour changes from green → yellow → red as time runs out. Use the Zustand quiz store's timeRemaining and decrementTimer action with a useEffect interval." },

  // ── Sprint 6 — UI, Features & Polish (Mar 10–16) ──────────────────────────

  // Thevindu — Question cards, page, navigation
  { epic: "E12", assignee: "thevindu", priority: "P1", points: 2,
    startDate: "2026-03-10", dueDate: "2026-03-11",
    summary: "Build AI quiz question card component with multiple types",
    desc: "Create components/quiz/quiz-card.tsx that renders different layouts based on question type. (1) MCQ type: Display the question text prominently, then 4 answer option buttons in a 2x2 grid. Each option shows the text and highlights green (correct) or red (incorrect) after submission. Use the same button styling pattern from the existing challenge card component. (2) FILL_IN_BLANK type: Display the Sinhala sentence with a visible blank space, a text input field for the answer, and a hint button that reveals a clue. (3) TRANSLATION type: Display the source text with the source language label, a text area for the user's translation, and a character count. All types show a 'Submit Answer' button that triggers the submitQuizAnswer server action, and after submission display the AI-generated explanation in a collapsible blue info panel." },

  { epic: "E12", assignee: "thevindu", priority: "P1", points: 1,
    startDate: "2026-03-12", dueDate: "2026-03-12",
    summary: "Create /ai-quiz page route under main layout",
    desc: "Add app/(main)/ai-quiz/page.tsx as a protected route within the authenticated main layout. The page should be an async server component that: (1) Authenticates via auth() and redirects to /sign-in if unauthenticated; (2) Fetches the user's active course and its units for the topic selector; (3) Fetches the user's quiz history for the stats display; (4) Fetches userProgress for the sidebar XP/hearts display; (5) Renders the quiz-config component initially, transitioning to the active quiz view when a quiz is started. Follow the same parallel Promise.all() data-fetching pattern used in app/(main)/learn/page.tsx. Add loading.tsx with skeleton placeholders." },

  { epic: "E12", assignee: "thevindu", priority: "P2", points: 1,
    startDate: "2026-03-13", dueDate: "2026-03-13",
    summary: "Add AI quiz navigation item to sidebar",
    desc: "Add an 'AI Quiz' navigation link to components/sidebar.tsx and the mobile navigation sheet. Use the lucide-react BrainCircuit icon to represent AI-powered quizzes. Position the link after the Chat navigation item in the sidebar menu order. Apply the same active state styling (green background highlight on the active route) used by other sidebar links. Set the href to '/ai-quiz'. Ensure the mobile sheet navigation (components/mobile-header.tsx) also includes the AI Quiz link with identical icon and styling." },

  { epic: "E12", assignee: "thevindu", priority: "P1", points: 1,
    startDate: "2026-03-14", dueDate: "2026-03-16",
    summary: "Implement AI-generated explanations for wrong answers",
    desc: "After the user submits a wrong answer on any question type, display the AI-generated explanation stored in the aiQuizQuestions.explanation field. Render the explanation in a collapsible panel below the question card with a light blue background and an info icon. The explanation should show: (1) The correct answer highlighted in green; (2) The user's incorrect answer struck through in red; (3) The Gemini-generated explanation text explaining why the correct answer is right, including relevant Sinhala grammar rules or vocabulary notes. Add a 'Got it' button that collapses the explanation and enables the 'Next Question' button." },

  // Supuni — Results, adaptive difficulty, XP
  { epic: "E12", assignee: "supuni", priority: "P1", points: 2,
    startDate: "2026-03-10", dueDate: "2026-03-11",
    summary: "Build quiz result screen with score summary, review, and history",
    desc: "Create components/quiz/quiz-result.tsx that displays after quiz completion. Show: (1) A large circular score display using react-circular-progressbar with percentage and letter grade (A/B/C/D/F); (2) Statistics row: total questions, correct answers, time taken, difficulty level; (3) A confetti animation (using existing react-confetti) triggered when score >= 80%; (4) A scrollable question review section showing each question with the user's answer (green if correct, red if wrong) and the correct answer; (5) Action buttons: 'Try Again' (same topic/difficulty), 'New Quiz' (back to config screen), 'Share Results' (copy score to clipboard). Call the completeQuizSession server action when this screen mounts to finalise the score and award XP. Also create a components/quiz/quiz-history.tsx component rendered on the quiz config page below the setup form. Fetch data using getQuizHistory() and getQuizStats() queries and display: a stats summary card (total quizzes taken, average score, best topic, streak), and a scrollable list of past quiz sessions showing topic, difficulty, score percentage with a colour-coded badge (green ≥80, yellow ≥50, red <50), and date. Clicking a past session shows the question review in a ShadCN Dialog modal." },

  { epic: "E12", assignee: "supuni", priority: "P2", points: 2,
    startDate: "2026-03-12", dueDate: "2026-03-14",
    summary: "Implement adaptive difficulty based on user performance",
    desc: "Create lib/adaptive-difficulty.ts with logic to calculate recommended difficulty for each topic. The algorithm: (1) Query the user's last 5 quiz sessions for the selected topic using getQuizHistory(); (2) Calculate the rolling average score; (3) If average score > 80%, recommend upgrading difficulty (beginner→intermediate, intermediate→advanced); (4) If average score < 40%, recommend downgrading difficulty; (5) Otherwise, keep current difficulty. Display the recommendation on the quiz config screen as a highlighted suggestion chip: 'Based on your performance, we recommend [Intermediate] difficulty for [Greetings]'. Store the recommendation in the Zustand quiz store so it persists during the session. The user can still override the recommendation and select any difficulty." },

  { epic: "E12", assignee: "supuni", priority: "P2", points: 2,
    startDate: "2026-03-14", dueDate: "2026-03-16",
    summary: "Add XP rewards and leaderboard integration for quiz completion",
    desc: "Award XP points when a quiz session is completed via the completeQuizSession server action. XP calculation: base 10 XP + (correctAnswers * 2) + difficulty bonus (beginner: 0, intermediate: 5, advanced: 10) + perfect score bonus (20 XP for 100%). Update the user's total points in the userProgress table using the same pattern as upsertChallengeProgress in actions/challenge-progress.ts. Show a Sonner toast notification with the XP earned: '+25 XP from AI Quiz!' with a sparkle icon. The earned XP should count towards the existing leaderboard rankings (no changes needed to the leaderboard page since it reads from userProgress.points) and quest milestone progress on the quests page." },

  // ══════════════════════════════════════════════════════════════════════════════
  //  E13 — CI/CD, DEVOPS, INFRASTRUCTURE & DEPLOYMENT
  //  Assignee: Januda (Lead / DevOps)
  // ══════════════════════════════════════════════════════════════════════════════

  { epic: "E13", assignee: "januda", priority: "P1", points: 3,
    startDate: "2026-03-01", dueDate: "2026-03-02",
    summary: "Set up Jira-GitHub CI/CD integration and automation workflows",
    desc: "Configure end-to-end CI/CD automation connecting Jira and GitHub for the SpeakifyLK project. Includes: (1) PR validation workflow — validates PR titles follow SPEAKLK-XXX: format or conventional commit pattern, auto-assigns PR to author; (2) Jira integration workflow — auto-generates PR description from Jira issue metadata and git diff stats, adds jira-linked label, posts PR link as a comment on the Jira issue; (3) Jira close-on-merge workflow — automatically transitions Jira issues to Done when the linked PR is merged, posts merge notification comment to Jira; (4) Copilot code review workflow — enables AI-powered code review via /copilot-review comment command on PRs; (5) Jira seed script — Node.js script to bulk-create epics and tasks with descriptions, assignees, story points, priorities, and dates via Jira REST API. All workflows use actions/github-script@v7 with generic Jira key patterns to support any project key." },
];

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀  SpeakifyLK — Jira AI Feature Seed\n");

  // Step 1: Resolve team account IDs
  console.log("👥  Resolving Jira account IDs...");
  const accountIdMap = {};
  for (const [key, email] of Object.entries(TEAM)) {
    try {
      const users = await jira("GET", `/rest/api/3/user/search?query=${encodeURIComponent(email)}`);
      if (users?.length) {
        accountIdMap[key] = users[0].accountId;
        console.log(`   ✅  ${key.padEnd(10)} → ${users[0].accountId}`);
      } else {
        console.warn(`   ⚠️   ${key} (${email}) — not found`);
      }
    } catch (err) { console.warn(`   ⚠️   ${key}: ${err.message}`); }
    await sleep(200);
  }

  // Step 2: Get issue type IDs
  console.log("\n🔍  Fetching issue types...");
  const projectData = await jira("GET", `/rest/api/3/project/${PROJECT_KEY}`);
  const issueTypes  = projectData.issueTypes || [];
  const epicType = issueTypes.find(t => t.name === "Epic");
  const taskType = issueTypes.find(t => t.name === "Task" || t.name === "Story");
  if (!epicType) throw new Error("'Epic' issue type not found");
  if (!taskType) throw new Error("'Task'/'Story' issue type not found");
  console.log(`   Epic → ${epicType.id} | Task → ${taskType.id} (${taskType.name})`);

  // Step 3: Create Epics
  console.log("\n📌  Creating Epics...");
  const epicKeyMap = {};
  for (const epic of EPICS) {
    try {
      const fields = {
        project:   { key: PROJECT_KEY },
        summary:   epic.summary,
        issuetype: { id: epicType.id },
        description: adf(epic.desc),
        "customfield_10016": epic.points,
      };
      const accountId = accountIdMap[epic.assignee];
      if (accountId) fields.assignee = { accountId };

      const result = await jira("POST", "/rest/api/3/issue", { fields });
      epicKeyMap[epic.id] = result.key;
      // Set story points via the agile estimation API as a fallback
      try { await jira("PUT", `/rest/agile/1.0/issue/${result.key}/estimation?boardId=${BOARD_ID}`, { value: String(epic.points) }); } catch (_) {
        try { await jira("PUT", `/rest/api/3/issue/${result.key}`, { fields: { "customfield_10034": epic.points } }); } catch (_2) {}
      }
      console.log(`   ✅  ${result.key} [${epic.points}pt]: ${epic.summary} → ${epic.assignee}`);
      await sleep(300);
    } catch (err) { console.error(`   ❌  Epic "${epic.summary}": ${err.message}`); }
  }

  // Step 4: Create Tasks (assigned to epics)
  console.log("\n📝  Creating Tasks...");
  const createdTasks = [];

  for (const task of TASKS) {
    const epicKey   = epicKeyMap[task.epic];
    const accountId = accountIdMap[task.assignee];
    if (!epicKey) { console.warn(`   ⚠️  No epic for ${task.epic}, skipping`); continue; }

    const fields = {
      project:     { key: PROJECT_KEY },
      summary:     task.summary,
      issuetype:   { id: taskType.id },
      parent:      { key: epicKey },
      priority:    { name: P[task.priority] },
      description: adf(task.desc),
      duedate:     task.dueDate,
      // Story points
      "customfield_10016": task.points,
      // Start date
      "customfield_10015": task.startDate,
    };
    if (accountId) fields.assignee = { accountId };

    try {
      const result = await jira("POST", "/rest/api/3/issue", { fields });
      // Set story points via the agile estimation API (fallback for different customfield IDs)
      try { await jira("PUT", `/rest/agile/1.0/issue/${result.key}/estimation?boardId=${BOARD_ID}`, { value: String(task.points) }); } catch (_) {
        try { await jira("PUT", `/rest/api/3/issue/${result.key}`, { fields: { "customfield_10034": task.points } }); } catch (_2) {}
      }
      console.log(`   ✅  ${result.key} [${task.priority}][${task.points}pt][${task.assignee}]: ${task.summary}`);
      createdTasks.push({ key: result.key, epic: task.epic, assignee: task.assignee, points: task.points });
      await sleep(200);
    } catch (err) {
      // Fallback without custom fields
      try {
        const fb = {
          project:     { key: PROJECT_KEY },
          summary:     task.summary,
          issuetype:   { id: taskType.id },
          parent:      { key: epicKey },
          priority:    { name: P[task.priority] },
          description: adf(task.desc),
          duedate:     task.dueDate,
        };
        if (accountId) fb.assignee = { accountId };
        const result = await jira("POST", "/rest/api/3/issue", { fields: fb });
        try { await jira("PUT", `/rest/agile/1.0/issue/${result.key}/estimation?boardId=${BOARD_ID}`, { value: String(task.points) }); } catch (_) {
          try { await jira("PUT", `/rest/api/3/issue/${result.key}`, { fields: { "customfield_10016": task.points } }); } catch (_2) {}
        }
        console.log(`   ✅  ${result.key} [${task.priority}][${task.points}pt][${task.assignee}]: ${task.summary} (fallback)`);
        createdTasks.push({ key: result.key, epic: task.epic, assignee: task.assignee, points: task.points });
      } catch (err2) { console.error(`   ❌  "${task.summary}": ${err2.message}`); }
      await sleep(200);
    }
  }

  // Step 5: Summary
  console.log("\n" + "═".repeat(60));
  console.log("📊  SUMMARY");
  console.log("═".repeat(60));

  // Points per member
  const byMember = {};
  for (const t of TASKS) byMember[t.assignee] = (byMember[t.assignee] || 0) + t.points;
  const totalTaskPts = Object.values(byMember).reduce((a, b) => a + b, 0);

  console.log("\n👤  Story points per member:");
  for (const [m, pts] of Object.entries(byMember).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${m.padEnd(12)} ${String(pts).padStart(3)} pts  (${"█".repeat(pts)})`);
  }
  console.log(`   ${"TOTAL".padEnd(12)} ${String(totalTaskPts).padStart(3)} pts`);

  // Points per epic
  console.log("\n📌  Story points per epic:");
  for (const e of EPICS) {
    const epicTasks = TASKS.filter(t => t.epic === e.id);
    const actualPts = epicTasks.reduce((a, t) => a + t.points, 0);
    console.log(`   ${e.id.padEnd(5)} ${e.summary.padEnd(48)} ${String(actualPts).padStart(3)} pts (${epicTasks.length} tasks)`);
  }

  // Tasks per epic per member
  console.log("\n📋  Tasks per member per epic:");
  for (const e of EPICS) {
    const epicTasks = TASKS.filter(t => t.epic === e.id);
    const memberGroups = {};
    for (const t of epicTasks) {
      if (!memberGroups[t.assignee]) memberGroups[t.assignee] = { count: 0, pts: 0 };
      memberGroups[t.assignee].count++;
      memberGroups[t.assignee].pts += t.points;
    }
    console.log(`   ${e.id} — ${e.summary}:`);
    for (const [m, data] of Object.entries(memberGroups)) {
      console.log(`      ${m.padEnd(12)} ${data.count} tasks, ${data.pts} pts`);
    }
  }

  console.log(`\n🎉  Jira seeded successfully!`);
  console.log(`   ${EPICS.length} Epics created (E13 has no tasks — add Januda's tasks manually)`);
  console.log(`   ${createdTasks.length}/${TASKS.length} Tasks created`);
  console.log(`   (Sprints were not created — add tasks to sprints manually via the Jira board)`);
}

main().catch(err => { console.error("\n💥 Fatal:", err.message); process.exit(1); });
