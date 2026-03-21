#!/usr/bin/env node
/**
 * SpeakifyLK -- Jira RAG Epic Seed Script
 * Renames SPEAKLK-37 to the RAG epic, then creates 30 tasks.
 * Januda's tasks (GCP/infra/terraform/auth conversion) go under SPEAKLK-3.
 * All other RAG implementation tasks go under SPEAKLK-37.
 *
 * Usage:
 *   JIRA_API_TOKEN=your_token node jira/jira-rag.js
 */

const JIRA_BASE_URL  = "https://speakifylk.atlassian.net";
const JIRA_EMAIL     = "desilvabethmin@gmail.com";
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const PROJECT_KEY    = "SPEAKLK";
const BOARD_ID       = 14;

// Existing epic keys
const RAG_EPIC_KEY    = "SPEAKLK-37"; // will be renamed
const JANUDA_EPIC_KEY = "SPEAKLK-3";  // januda's tasks go here

if (!JIRA_API_TOKEN) {
  console.error("JIRA_API_TOKEN env var is required.");
  console.error("Run: JIRA_API_TOKEN=your_token node jira/jira-rag.js");
  process.exit(1);
}

const AUTH    = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");
const headers = { Authorization: `Basic ${AUTH}`, Accept: "application/json", "Content-Type": "application/json" };

// --- Helpers ---
async function jira(method, path, body) {
  const res  = await fetch(`${JIRA_BASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const adf   = (text) => ({ version: 1, type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

// --- Team ---
const TEAM = {
  januda:    "desilvabethmin@gmail.com",
  thevindu:  "thevindukevin@gmail.com",
  sandalika: "sandalika24@gmail.com",
  supuni:    "supuniab1@gmail.com",
  naduni:    "nadutash0@gmail.com",
};

// --- Priority map ---
const P = { P1: "Highest", P2: "High", P3: "Low", P4: "Lowest" };

// --- Epic update ---
const RAG_EPIC = {
  summary: "Vertex AI RAG Engine (Managed)",
  desc: "Implement Retrieval-Augmented Generation using Google Vertex AI RAG Engine for the SpeakifyLK platform. Covers GCP project setup with Terraform, service account provisioning, OAuth2 auth helper, course content export to GCS, RAG corpus creation and file import, RAG integration into the AI chat assistant, and RAG integration into the AI quiz engine. Ensures all AI responses are grounded in actual course content for accurate, contextual Sinhala language learning."
};

// --- 30 Tasks ---
// januda tasks -> JANUDA_EPIC_KEY (SPEAKLK-3) -- GCP/infra/terraform/auth conversion only
// all others  -> RAG_EPIC_KEY (SPEAKLK-37)    -- RAG implementation

const TASKS = [

  // ============================================================================
  //  JANUDA -- GCP PROJECT, TERRAFORM, INFRA & AUTH CONVERSION (10 tasks, 22 pts)
  //  All tasks -> SPEAKLK-3
  // ============================================================================

  { assignee: "januda", priority: "P1", points: 2,
    startDate: "2026-03-22", dueDate: "2026-03-22",
    summary: "Create GCP project with billing enabled and enable Vertex AI API",
    desc: "Create a new Google Cloud project (or use existing) for SpeakifyLK RAG. Enable billing on the project. Enable the Vertex AI API (aiplatform.googleapis.com) and Cloud Storage API (storage.googleapis.com). Document the project ID. Verify API enablement by running gcloud services list --enabled and confirming both APIs appear." },

  { assignee: "januda", priority: "P1", points: 1,
    startDate: "2026-03-22", dueDate: "2026-03-22",
    summary: "Create service account with roles/aiplatform.user role",
    desc: "Create a GCP service account named speakifylk-rag-sa in the project. Grant it the roles/aiplatform.user IAM role for Vertex AI access and roles/storage.objectAdmin for managing GCS objects. Generate a JSON key file for the service account. Verify the service account can authenticate by running a simple gcloud auth test." },

  { assignee: "januda", priority: "P1", points: 1,
    startDate: "2026-03-23", dueDate: "2026-03-23",
    summary: "Configure GOOGLE_APPLICATION_CREDENTIALS and GCP env vars in .env.local",
    desc: "Add the service account JSON key path to .env.local as GOOGLE_APPLICATION_CREDENTIALS. Also add GCP_PROJECT_ID and GCP_LOCATION (e.g., us-central1) environment variables. Update .env.example with placeholder values for team reference. Ensure .gitignore includes the JSON key file path to prevent accidental commits of credentials." },

  { assignee: "januda", priority: "P1", points: 3,
    startDate: "2026-03-23", dueDate: "2026-03-25",
    summary: "Terraform: GCP project, provider config, and API enablement",
    desc: "Create infra/terraform/ directory with main.tf, variables.tf, and outputs.tf. Configure the Google provider with project ID and region variables. Define google_project_service resources to enable aiplatform.googleapis.com, storage.googleapis.com, and iam.googleapis.com APIs. Add a terraform.tfvars.example with placeholder values. Configure a GCS backend for Terraform state (or local state for now). Ensure terraform plan runs cleanly with no errors." },

  { assignee: "januda", priority: "P1", points: 2,
    startDate: "2026-03-25", dueDate: "2026-03-26",
    summary: "Terraform: Service account, IAM role bindings, and key management",
    desc: "Add Terraform resources for: google_service_account for speakifylk-rag-sa, google_project_iam_member for roles/aiplatform.user and roles/storage.objectAdmin bindings, and google_service_account_key for JSON key generation. Output the service account email and key via terraform output. Add a README.md in infra/terraform/ documenting how to run terraform init, plan, and apply." },

  { assignee: "januda", priority: "P1", points: 2,
    startDate: "2026-03-26", dueDate: "2026-03-27",
    summary: "Terraform: GCS bucket creation and storage IAM permissions",
    desc: "Add Terraform resources for: google_storage_bucket named speakifylk-rag-content with location matching GCP_LOCATION, uniform bucket-level access enabled, and lifecycle rule to delete objects older than 90 days. Add google_storage_bucket_iam_member to grant the service account roles/storage.objectAdmin on the bucket. Output the bucket name via terraform output. Run terraform apply and verify the bucket is created." },

  { assignee: "januda", priority: "P2", points: 2,
    startDate: "2026-03-27", dueDate: "2026-03-28",
    summary: "Terraform: Remote state backend configuration and module organization",
    desc: "Configure Terraform remote state using a GCS backend bucket. Organize Terraform code into logical modules: modules/project (APIs), modules/iam (service account, roles), modules/storage (GCS bucket). Update main.tf to reference modules. Add terraform.tfvars.example. Ensure terraform init -migrate-state works for moving from local to remote state. Document the module structure in the infra/terraform/README.md." },

  { assignee: "januda", priority: "P1", points: 3,
    startDate: "2026-03-28", dueDate: "2026-03-30",
    summary: "Create lib/gcp-auth.ts OAuth2 access token generation from service account",
    desc: "Create lib/gcp-auth.ts that reads the service account JSON key from the path specified in GOOGLE_APPLICATION_CREDENTIALS. Use GoogleAuth from the google-auth-library package (installed in the dependency task) to create an auth client scoped to https://www.googleapis.com/auth/cloud-platform. Export an async function getAccessToken() that returns a valid OAuth2 access token string. Implement token caching: store the token and its expiry, only refresh when expired or within 5 minutes of expiry. Export getAuthHeaders() that returns { Authorization: Bearer <token> } for use in Vertex AI REST calls. Add a runtime check that throws a clear error if GOOGLE_APPLICATION_CREDENTIALS is not set or the file does not exist." },

  { assignee: "januda", priority: "P1", points: 3,
    startDate: "2026-03-30", dueDate: "2026-04-01",
    summary: "Refactor lib/gemini.ts from API key authentication to service account auth",
    desc: "Modify the existing lib/gemini.ts to replace API key-based authentication with service account OAuth2 tokens. Currently the file uses GoogleGenAI from @google/genai, initialized with process.env.GEMINI_API_KEY (with optional Vertex AI Express Mode via GOOGLE_GENAI_USE_VERTEXAI flag). Change the getOrCreateClient() function to authenticate using service account credentials from lib/gcp-auth.ts instead of an API key. Update getGeminiClient() and getModel() exports to work with the new auth flow. Update startChatSession() to use the service-account-authenticated client. Ensure backward compatibility: if GOOGLE_APPLICATION_CREDENTIALS is not set, log a warning and fall back to the existing API key auth (GEMINI_API_KEY) so dev setups keep working during transition." },

  { assignee: "januda", priority: "P1", points: 3,
    startDate: "2026-04-01", dueDate: "2026-04-03",
    summary: "Update /api/chat and /api/quiz routes to use service account auth flow",
    desc: "Update app/api/chat/route.ts and app/api/quiz/generate/route.ts to use the refactored lib/gemini.ts with service account authentication. In the chat route, verify that ai.models.generateContentStream() (called via getGeminiClient()) now uses the service account client. In the quiz route, verify that generateContent() (used inside callGeminiWithRetry()) works with the new auth flow. Test that chat streaming still works correctly and quiz generation returns valid JSON questions. Keep GEMINI_API_KEY in environment.d.ts for fallback compatibility. Add integration test script scripts/test-gcp-auth.ts that verifies token generation and a simple Vertex AI call." },

  // ============================================================================
  //  SANDALIKA -- CONTENT EXPORT & RAG CORPUS (5 tasks, 11 pts)
  //  All tasks -> SPEAKLK-37
  // ============================================================================

  { assignee: "sandalika", priority: "P1", points: 2,
    startDate: "2026-03-24", dueDate: "2026-03-25",
    summary: "Create database query functions for course content export",
    desc: "Add export-specific query functions in a new db/export-queries.ts file. Implement: getAllChallengesWithOptions() - returns all challenges joined with their challengeOptions, grouped by lesson; getAllLessonsWithContext() - returns all lessons with their parent unit and course names; getCourseStructure() - returns the full course hierarchy (courses -> units -> lessons -> challenges). Use Drizzle ORM relational queries with proper joins. These queries are used only by the export script, not at app runtime." },

  { assignee: "sandalika", priority: "P1", points: 2,
    startDate: "2026-03-25", dueDate: "2026-03-26",
    summary: "Build content chunking formatter for RAG-ready structured text",
    desc: "Create lib/content-formatter.ts with functions to transform raw database records into structured text chunks suitable for RAG ingestion. Implement: formatChallengeChunk(challenge, options) - formats a single challenge with its options into a text block including lesson context, question type, correct answer, and all options; formatLessonChunk(lesson, challenges) - formats an entire lesson with all its challenges as one coherent document; formatCourseManifest(course) - creates a summary document listing all units and lessons. Each chunk should include metadata headers (course name, unit, lesson, challenge type) to improve RAG retrieval relevance." },

  { assignee: "sandalika", priority: "P1", points: 3,
    startDate: "2026-03-28", dueDate: "2026-03-30",
    summary: "Create RAG corpus provisioning script via Vertex AI REST API",
    desc: "Create scripts/create-rag-corpus.ts that provisions a new Vertex AI RAG corpus using the REST API. The script should: (1) Import getAuthHeaders() from lib/gcp-auth.ts; (2) Send a POST to https://{GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/{GCP_PROJECT_ID}/locations/{GCP_LOCATION}/ragCorpora with displayName: 'speakifylk-course-content'; (3) Parse the response to extract the corpus resource name and ID; (4) Print the corpus ID for .env.local configuration; (5) Support a --check flag that lists existing corpora. Handle API errors with descriptive messages. Add npm run rag:create to package.json." },

  { assignee: "sandalika", priority: "P1", points: 3,
    startDate: "2026-03-30", dueDate: "2026-04-01",
    summary: "Implement GCS file import into RAG corpus with chunking configuration",
    desc: "Create scripts/import-rag-files.ts that imports course content files from GCS into the RAG corpus. The script should: (1) Read RAG_CORPUS_ID from environment; (2) List all files in the GCS bucket under rag-content/ prefix; (3) For each file, call the Vertex AI ImportRagFiles API with the GCS URI and chunking config (chunkSize: 512 tokens, chunkOverlap: 100 tokens); (4) Poll the import operation status until completion; (5) Log success/failure for each file. Support batch imports for efficiency. Add npm run rag:import to package.json." },

  { assignee: "sandalika", priority: "P2", points: 1,
    startDate: "2026-04-01", dueDate: "2026-04-01",
    summary: "Add export and RAG npm scripts to package.json and document usage",
    desc: "Add script entries to package.json: export:content, export:content:dry-run, rag:create, rag:import, rag:import:force, rag:status. Test that all commands run correctly. Add a brief comment block at the top of each script documenting required env vars and example usage. Verify the full pipeline works end-to-end: query DB -> format chunks -> write JSON -> upload GCS -> create corpus -> import files." },

  // ============================================================================
  //  NADUNI -- CONTENT EXPORT UPLOAD & RAG CHAT INTEGRATION (5 tasks, 13 pts)
  //  All tasks -> SPEAKLK-37
  // ============================================================================

  { assignee: "naduni", priority: "P1", points: 3,
    startDate: "2026-03-25", dueDate: "2026-03-27",
    summary: "Create scripts/export-course-content.ts main orchestrator script",
    desc: "Create scripts/export-course-content.ts as the main export script. The script should: (1) Import and call the export query functions to fetch all course data from the Neon database; (2) Use the content formatter to transform each lesson into structured text chunks; (3) Write each chunk to a local JSON file in tmp/rag-content/ with naming convention course-{id}_unit-{id}_lesson-{id}.json; (4) Each JSON file should contain: { metadata: { courseId, unitId, lessonId, title }, content: formattedText }; (5) Print a summary of files generated (count, total size). Support a --dry-run flag. Handle database connection errors gracefully." },

  { assignee: "naduni", priority: "P1", points: 2,
    startDate: "2026-03-27", dueDate: "2026-03-28",
    summary: "Implement GCS upload logic using @google-cloud/storage SDK",
    desc: "Install @google-cloud/storage via bun add. Extend scripts/export-course-content.ts to upload generated JSON files to the GCS bucket after local file creation. Use the Storage client authenticated via GOOGLE_APPLICATION_CREDENTIALS. Upload files to a rag-content/ prefix. Implement: parallel uploads (up to 5 concurrent), progress logging per file, skip upload if content hash matches existing GCS object, and a summary of uploaded/skipped/failed files." },

  { assignee: "naduni", priority: "P1", points: 3,
    startDate: "2026-04-01", dueDate: "2026-04-03",
    summary: "Create lib/vertex-rag.ts with generateWithRAG function",
    desc: "Create lib/vertex-rag.ts as the core RAG integration module. Implement: (1) retrieveContext(query, corpusId) - calls the Vertex AI RetrieveContexts API to fetch relevant chunks from the RAG corpus based on the user's message, configured with similarity_top_k: 5 and vector_distance_threshold: 0.7; (2) generateWithRAG(messages, systemPrompt) - retrieves relevant context chunks, injects them into the system prompt as grounding context, calls Gemini via Vertex AI REST generateContent endpoint with the augmented prompt and conversation history, returns a streaming response. Use getAuthHeaders() from lib/gcp-auth.ts for authentication." },

  { assignee: "naduni", priority: "P1", points: 3,
    startDate: "2026-04-03", dueDate: "2026-04-05",
    summary: "Modify app/api/chat/route.ts to use generateWithRAG for RAG-grounded responses",
    desc: "Update the existing /api/chat route to use RAG-grounded responses. The current route imports getGeminiClient, getModel, safetySettings, generationConfig from lib/gemini.ts and calls ai.models.generateContentStream() with the system prompt (SINHALA_TUTOR_PROMPT + courseContext) and geminiHistory. Changes: (1) Import generateWithRAG from lib/vertex-rag.ts; (2) Replace the ai.models.generateContentStream() call in the try block (step 8 in the route) with generateWithRAG(geminiHistory, SINHALA_TUTOR_PROMPT + courseContext); (3) Parse the Vertex AI streaming response (newline-delimited JSON with candidates[0].content.parts[0].text) instead of iterating chunk.text; (4) Keep the existing ReadableStream piping pattern, TextEncoder, and fullResponse accumulation; (5) Keep existing message persistence logic (sendMessage before, saveAssistantMessage after streaming). Ensure the geminiHistory format (role: 'user'/'model', parts: [{text}]) maps correctly to Vertex AI message structure." },

  { assignee: "naduni", priority: "P2", points: 2,
    startDate: "2026-04-05", dueDate: "2026-04-06",
    summary: "Add graceful fallback to non-RAG chat flow on RAG failure",
    desc: "Add error handling in app/api/chat/route.ts so if the RAG call fails (network error, corpus unavailable, auth failure), the route falls back to the current non-RAG Gemini flow. Implement: (1) Wrap the generateWithRAG call in try-catch; (2) On catch, log the error with details (error type, status code, message); (3) Fall back to the original flow: getGeminiClient() then ai.models.generateContentStream() with getModel(), safetySettings, generationConfig, SINHALA_TUTOR_PROMPT + courseContext, and geminiHistory -- exactly as the route works today; (4) Add response header X-RAG-Status: 'active' or 'fallback' so the frontend can optionally indicate grounding status. Test the fallback by temporarily setting an invalid RAG_CORPUS_ID." },

  // ============================================================================
  //  THEVINDU -- AUTH SETUP & RAG QUIZ SUPPORT (5 tasks, 8 pts)
  //  All tasks -> SPEAKLK-37
  // ============================================================================

  { assignee: "thevindu", priority: "P2", points: 1,
    startDate: "2026-03-23", dueDate: "2026-03-23",
    summary: "Install google-auth-library and @google-cloud/storage dependencies",
    desc: "Install google-auth-library and @google-cloud/storage packages via bun add (the project already has @google/genai installed). Verify both new packages appear in package.json dependencies. Check that TypeScript types are included (both packages ship their own types). Run bun install to ensure the lockfile is updated. Verify no dependency conflicts with the existing @google/genai package or other dependencies." },

  { assignee: "thevindu", priority: "P2", points: 1,
    startDate: "2026-03-24", dueDate: "2026-03-24",
    summary: "Add GCP environment variable type declarations to environment.d.ts",
    desc: "Update the existing environment.d.ts (which already declares GEMINI_API_KEY and GEMINI_MODEL) to add TypeScript type declarations for: GOOGLE_APPLICATION_CREDENTIALS (string), GCP_PROJECT_ID (string), GCP_LOCATION (string), RAG_CORPUS_ID (string), and GOOGLE_GENAI_USE_VERTEXAI (string, optional). Follow the existing pattern in the file for declaring process.env types. This ensures TypeScript autocomplete and type safety when accessing these env vars throughout the codebase." },

  { assignee: "thevindu", priority: "P2", points: 2,
    startDate: "2026-04-04", dueDate: "2026-04-05",
    summary: "Update quiz prompt templates to incorporate RAG content chunks",
    desc: "Modify lib/quiz-prompt.ts to support RAG context. Add an optional ragContext: string field to the QuizPromptParams interface. Update each prompt builder function (buildMultipleChoicePrompt, buildFillInBlankPrompt, buildTranslationPrompt) to check for ragContext in params. When ragContext is provided: (1) Prepend context with instruction: 'Use ONLY the following course content to generate questions. Do not use general knowledge.'; (2) Format RAG chunks as numbered source blocks with metadata (lesson title, unit); (3) Add constraint that each question must reference specific content from provided sources; (4) For TRANSLATION type (buildTranslationPrompt), ensure source/target text comes from actual lesson vocabulary. When ragContext is not provided, the existing buildQuizPrompt() function and all templates work exactly as before with no changes to the public API." },

  { assignee: "thevindu", priority: "P2", points: 2,
    startDate: "2026-04-05", dueDate: "2026-04-06",
    summary: "Add fallback for RAG failures in quiz generation route",
    desc: "Add error handling in app/api/quiz/generate/route.ts so if RAG retrieval or RAG-augmented generation fails, the route falls back to the current non-RAG quiz generation flow. The current flow uses buildQuizPrompt() to create prompts and callGeminiWithRetry() which calls generateContent() from lib/gemini.ts. Implement: (1) Wrap the RAG-enhanced generation path in try-catch; (2) On catch, log the error and fall back to the original flow: buildQuizPrompt() without ragContext, then callGeminiWithRetry(); (3) Mark the quiz session with ragGrounded: false metadata flag so results can be distinguished; (4) Ensure fallback generates valid questions the frontend renders without changes." },

  { assignee: "thevindu", priority: "P2", points: 2,
    startDate: "2026-04-06", dueDate: "2026-04-07",
    summary: "End-to-end test: RAG-powered chat with course vocabulary questions",
    desc: "Create scripts/test-rag-chat.ts that: (1) Authenticates as a test user; (2) Sends test messages to /api/chat asking about course content (e.g., 'What are the Sinhala words for colours?', 'How do you say hello in Sinhala?'); (3) Verifies responses contain information from the RAG corpus (not just generic Gemini knowledge); (4) Checks the X-RAG-Status header is 'active'; (5) Tests fallback by sending a request with RAG disabled and comparing response quality. Document test results and any issues found." },

  // ============================================================================
  //  SUPUNI -- RAG CORPUS MANAGEMENT & QUIZ RAG INTEGRATION (5 tasks, 11 pts)
  //  All tasks -> SPEAKLK-37
  // ============================================================================

  { assignee: "supuni", priority: "P2", points: 2,
    startDate: "2026-04-01", dueDate: "2026-04-02",
    summary: "Add RAG_CORPUS_ID env config and re-import support for content changes",
    desc: "After corpus creation, add RAG_CORPUS_ID to .env.local and .env.example. Extend scripts/import-rag-files.ts to support incremental re-imports: (1) A --force flag that deletes all existing RagFiles in the corpus before re-importing; (2) A --diff flag that compares GCS file hashes with a local manifest (.rag-import-manifest.json) and only imports changed files; (3) After successful import, update the manifest with current file hashes and timestamps. Add npm run rag:import:force script to package.json." },

  { assignee: "supuni", priority: "P2", points: 2,
    startDate: "2026-04-02", dueDate: "2026-04-03",
    summary: "Implement import status checking and per-file error reporting",
    desc: "Add a status checking mode to scripts/import-rag-files.ts with a --status flag. When invoked: (1) List all RagFiles in the corpus via the ListRagFiles API; (2) Display each file's name, import state (ACTIVE, IMPORTING, FAILED), chunk count, and size; (3) Highlight failed imports with the error reason; (4) Show summary: total files, active count, failed count, total chunks. Add npm run rag:status to package.json. This provides visibility into the RAG corpus state without needing the GCP console." },

  { assignee: "supuni", priority: "P1", points: 2,
    startDate: "2026-04-03", dueDate: "2026-04-04",
    summary: "Create lib/quiz-rag.ts for RAG-enhanced quiz question generation",
    desc: "Create lib/quiz-rag.ts that uses the RAG engine to generate quiz questions grounded in actual course content. Implement: (1) getQuizContext(topic, difficulty) - calls retrieveContext() from lib/vertex-rag.ts with a query tailored to the quiz topic and difficulty; (2) generateQuizWithRAG(topic, difficulty, questionCount, questionTypes) - retrieves relevant course content chunks, builds a Gemini prompt including retrieved content as source material, instructs Gemini to generate questions ONLY from provided content, returns parsed quiz questions in expected JSON format. Reuse existing prompt templates from lib/quiz-prompt.ts, augmenting with RAG context." },

  { assignee: "supuni", priority: "P1", points: 3,
    startDate: "2026-04-04", dueDate: "2026-04-06",
    summary: "Modify /api/quiz/generate route to use RAG context retrieval",
    desc: "Update app/api/quiz/generate/route.ts to use RAG-grounded quiz generation. The current flow builds prompts via buildQuizPrompt(quizType, params) from lib/quiz-prompt.ts, then calls callGeminiWithRetry(prompt, quizType, count) which uses generateContent() from lib/gemini.ts. Changes: (1) Import getQuizContext from lib/quiz-rag.ts; (2) Before the per-type question generation loop, call getQuizContext(body.topic, body.difficulty) to retrieve relevant course content from the RAG corpus; (3) Pass the retrieved context as ragContext in the QuizPromptParams when calling buildQuizPrompt(), so Gemini generates questions based on actual lesson content; (4) Keep existing callGeminiWithRetry(), quiz session insert, and question persistence logic unchanged; (5) Add retrieved context source (which lessons/challenges were used) to quiz session metadata for traceability. Ensure the response format stays compatible with the existing quiz frontend components." },

  { assignee: "supuni", priority: "P2", points: 2,
    startDate: "2026-04-06", dueDate: "2026-04-07",
    summary: "End-to-end test: RAG-powered quiz generation with course content",
    desc: "Create scripts/test-rag-quiz.ts that: (1) Calls /api/quiz/generate with a topic matching existing course content (e.g., 'Greetings' from Unit 1); (2) Verifies generated questions reference actual course vocabulary and phrases from the RAG corpus; (3) Checks MCQ options include real lesson content, not hallucinated alternatives; (4) Tests all three question types (mcq, fill_blank, translation) with RAG context; (5) Tests fallback by disabling RAG and comparing question quality; (6) Documents test results including response times with and without RAG." },
];

// --- Main ---
async function main() {
  console.log("SpeakifyLK -- Jira RAG Epic Seed\n");

  // Step 1: Resolve team account IDs
  console.log("Resolving Jira account IDs...");
  const accountIdMap = {};
  for (const [key, email] of Object.entries(TEAM)) {
    try {
      const users = await jira("GET", `/rest/api/3/user/search?query=${encodeURIComponent(email)}`);
      if (users?.length) {
        accountIdMap[key] = users[0].accountId;
        console.log(`   ${key.padEnd(10)} -> ${users[0].accountId}`);
      } else {
        console.warn(`   WARN: ${key} (${email}) -- not found`);
      }
    } catch (err) { console.warn(`   WARN: ${key}: ${err.message}`); }
    await sleep(200);
  }

  // Step 2: Rename SPEAKLK-37 epic
  console.log(`\nRenaming ${RAG_EPIC_KEY} to "${RAG_EPIC.summary}"...`);
  try {
    await jira("PUT", `/rest/api/3/issue/${RAG_EPIC_KEY}`, {
      fields: {
        summary: RAG_EPIC.summary,
        description: adf(RAG_EPIC.desc),
      }
    });
    console.log(`   OK: ${RAG_EPIC_KEY} renamed`);
  } catch (err) {
    console.error(`   FAIL: Could not rename ${RAG_EPIC_KEY}: ${err.message}`);
  }
  await sleep(300);

  // Step 3: Get task issue type ID
  console.log("\nFetching issue types...");
  const projectData = await jira("GET", `/rest/api/3/project/${PROJECT_KEY}`);
  const issueTypes  = projectData.issueTypes || [];
  const taskType = issueTypes.find(t => t.name === "Task" || t.name === "Story");
  if (!taskType) throw new Error("'Task'/'Story' issue type not found");
  console.log(`   Task type -> ${taskType.id} (${taskType.name})`);

  // Step 4: Create Tasks
  console.log("\nCreating 30 Tasks...");
  const createdTasks = [];

  for (let i = 0; i < TASKS.length; i++) {
    const task = TASKS[i];
    const parentKey = task.assignee === "januda" ? JANUDA_EPIC_KEY : RAG_EPIC_KEY;
    const accountId = accountIdMap[task.assignee];

    const fields = {
      project:     { key: PROJECT_KEY },
      summary:     task.summary,
      issuetype:   { id: taskType.id },
      parent:      { key: parentKey },
      priority:    { name: P[task.priority] },
      description: adf(task.desc),
      duedate:     task.dueDate,
      "customfield_10016": task.points,
      "customfield_10015": task.startDate,
    };
    if (accountId) fields.assignee = { accountId };

    try {
      const result = await jira("POST", "/rest/api/3/issue", { fields });
      try { await jira("PUT", `/rest/agile/1.0/issue/${result.key}/estimation?boardId=${BOARD_ID}`, { value: String(task.points) }); } catch (_) {
        try { await jira("PUT", `/rest/api/3/issue/${result.key}`, { fields: { "customfield_10034": task.points } }); } catch (_2) {}
      }
      console.log(`   [${String(i+1).padStart(2)}] ${result.key} [${task.priority}][${task.points}pt][${task.assignee}] -> ${parentKey}: ${task.summary}`);
      createdTasks.push({ key: result.key, assignee: task.assignee, points: task.points, parent: parentKey });
      await sleep(200);
    } catch (err) {
      // Fallback without custom fields
      try {
        const fb = {
          project:     { key: PROJECT_KEY },
          summary:     task.summary,
          issuetype:   { id: taskType.id },
          parent:      { key: parentKey },
          priority:    { name: P[task.priority] },
          description: adf(task.desc),
          duedate:     task.dueDate,
        };
        if (accountId) fb.assignee = { accountId };
        const result = await jira("POST", "/rest/api/3/issue", { fields: fb });
        try { await jira("PUT", `/rest/agile/1.0/issue/${result.key}/estimation?boardId=${BOARD_ID}`, { value: String(task.points) }); } catch (_) {
          try { await jira("PUT", `/rest/api/3/issue/${result.key}`, { fields: { "customfield_10016": task.points } }); } catch (_2) {}
        }
        console.log(`   [${String(i+1).padStart(2)}] ${result.key} [${task.priority}][${task.points}pt][${task.assignee}] -> ${parentKey}: ${task.summary} (fallback)`);
        createdTasks.push({ key: result.key, assignee: task.assignee, points: task.points, parent: parentKey });
      } catch (err2) { console.error(`   FAIL [${i+1}]: "${task.summary}": ${err2.message}`); }
      await sleep(200);
    }
  }

  // Step 5: Summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  const byMember = {};
  const taskCountByMember = {};
  for (const t of TASKS) {
    byMember[t.assignee] = (byMember[t.assignee] || 0) + t.points;
    taskCountByMember[t.assignee] = (taskCountByMember[t.assignee] || 0) + 1;
  }
  const totalPts = Object.values(byMember).reduce((a, b) => a + b, 0);

  console.log("\nStory points per member:");
  for (const [m, pts] of Object.entries(byMember).sort((a, b) => b[1] - a[1])) {
    const count = taskCountByMember[m];
    console.log(`   ${m.padEnd(12)} ${String(pts).padStart(3)} pts  (${count} tasks)  ${"#".repeat(pts)}`);
  }
  console.log(`   ${"TOTAL".padEnd(12)} ${String(totalPts).padStart(3)} pts  (${TASKS.length} tasks)`);

  console.log("\nTask distribution:");
  console.log(`   Januda tasks -> ${JANUDA_EPIC_KEY} (${TASKS.filter(t => t.assignee === "januda").length} tasks, GCP/Terraform/Auth)`);
  console.log(`   Others tasks -> ${RAG_EPIC_KEY} (${TASKS.filter(t => t.assignee !== "januda").length} tasks, RAG implementation)`);

  // Per-member area breakdown
  console.log("\nPer-member breakdown:");
  const areas = {
    januda:    "GCP project, Terraform infra, service account auth, code conversion",
    sandalika: "DB export queries, content formatter, RAG corpus creation, file import",
    naduni:    "Export script, GCS upload, vertex-rag lib, chat RAG integration",
    thevindu:  "Dependencies, env types, quiz prompt templates, chat E2E test",
    supuni:    "RAG config, import status, quiz-rag lib, quiz RAG integration",
  };
  for (const [m, area] of Object.entries(areas)) {
    console.log(`   ${m.padEnd(12)} ${area}`);
  }

  console.log(`\nDone! ${createdTasks.length}/${TASKS.length} tasks created.`);
}

main().catch(err => { console.error("\nFatal:", err.message); process.exit(1); });
