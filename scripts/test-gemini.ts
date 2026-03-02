import * as dotenv from "dotenv";
// Load .env.local BEFORE importing gemini (which checks for the API key at load time)
dotenv.config({ path: ".env.local" });

async function testGemini() {
  console.log("Testing Gemini client...\n");

  try {
    // Dynamic import so dotenv loads first
    const { getGeminiModel } = await import("../lib/gemini");

    const model = getGeminiModel();
    const result = await model.generateContent(
      "Say hello in three different languages. Keep it brief."
    );
    const response = result.response;
    const text = response.text();

    console.log("Gemini responded successfully:\n");
    console.log(text);
  } catch (error) {
    console.error("Gemini test failed:\n", error);
    process.exit(1);
  }
}

testGemini();
