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
  } catch (error: any) {
    console.error("Gemini test failed:\n");
    console.error("Status:", error.status);
    console.error("Message:", error.message);
    if (error.errorDetails) {
      console.error("Details:", JSON.stringify(error.errorDetails, null, 2));
    }
    process.exit(1);
  }
}

testGemini();
