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

      // gemini model id (defaults to gemini-3.1-pro-preview)
      GEMINI_MODEL?: string;

      // set to '1' to disable safety filters (BLOCK_NONE)
      GEMINI_UNSAFE_MODE?: string;
    }
  }
}
