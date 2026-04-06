// This file is needed to support autocomplete for process.env
export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // neon db uri
      DATABASE_URL: string;

      // stripe api key and webhook
      STRIPE_API_SECRET_KEY: string;
      STRIPE_WEBHOOK_SECRET: string;

      // public app url
      NEXT_PUBLIC_APP_URL: string;

      // clerk admin user id(s) (separated by comma(,) and space( )). Ex: "user_123, user_456, user_789"
      CLERK_ADMIN_IDS: string;

      // gemini ai api key
      GEMINI_API_KEY: string;

      // gemini model id (gemini-3.1-pro-preview / gemini-3.1-flash-lite-preview)
      GEMINI_MODEL?: string;

      // set to '1' to disable safety filters (BLOCK_NONE)
      GEMINI_UNSAFE_MODE?: string;

      // google cloud platform — service account authentication
      GCP_PROJECT_ID: string;
      GCP_LOCATION: string;
      GOOGLE_SERVICE_ACCOUNT_KEY?: string;

      // RAG corpus (future)
      RAG_CORPUS_ID?: string;

      /** Set to "1" to skip Vertex retrieval (quiz API / scripts use non-RAG fallback). */
      QUIZ_DISABLE_RAG?: string;

      /** Optional: E2E quiz script — base URL (e.g. http://localhost:3000) for POST /api/quiz/generate */
      QUIZ_E2E_BASE_URL?: string;
      /** Browser Cookie header while logged in (must include Clerk session). */
      QUIZ_E2E_COOKIE?: string;
      /** Optional: second dev server with QUIZ_DISABLE_RAG=1 for HTTP timing comparison */
      QUIZ_E2E_NO_RAG_BASE_URL?: string;

      // vertex ai toggle
      GOOGLE_GENAI_USE_VERTEXAI?: string;
    }
  }
}
