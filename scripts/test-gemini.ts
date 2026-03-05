import * as dotenv from "dotenv";
// Load .env, then optional .env.local as an override, BEFORE importing gemini
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

async function testGemini() {
  console.log("Testing Gemini client...\n");

  try {
    // Dynamic import so dotenv loads first
    const { generateContent } = await import("../lib/gemini");

    const response = await generateContent(
      "Say hello in three different languages. Keep it brief."
    );
    const text = response.text;

    console.log("Gemini responded successfully:\n");
    console.log(text);
  } catch (error: unknown) {
    console.error("Gemini test failed:\n");

    // Log the raw error for debugging
    console.error("Raw error:", error);

    // Safely try to extract structured information
    if (typeof error === "object" && error !== null) {
      const anyError = error as { status?: unknown; message?: unknown; errorDetails?: unknown };

      if ("status" in anyError && anyError.status !== undefined) {
        console.error("Status:", anyError.status);
      }

      if ("message" in anyError && typeof anyError.message === "string") {
        console.error("Message:", anyError.message);
      } else if (error instanceof Error) {
        console.error("Message:", error.message);
      }

      if ("errorDetails" in anyError && anyError.errorDetails !== undefined) {
        try {
          console.error("Details:", JSON.stringify(anyError.errorDetails, null, 2));
        } catch {
          console.error("Details:", anyError.errorDetails);
        }
      }
    } else if (error instanceof Error) {
      console.error("Message:", error.message);
    }

    process.exit(1);
  }
}

testGemini();
