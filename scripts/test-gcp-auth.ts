import * as dotenv from "dotenv";
// Load .env, then optional .env.local as an override, BEFORE importing gemini
dotenv.config();
dotenv.config({ path: ".env.local", override: true });

async function testGcpAuth() {
  console.log("=== GCP Service Account Auth Integration Test ===\n");

  // ── 1. Verify environment variables ──
  const saKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const model = process.env.GEMINI_MODEL;

  if (!saKey) {
    console.error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is not set.\n" +
        "Set it in .env or .env.local to run this test."
    );
    process.exit(1);
  }

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(saKey);
    console.log(
      "Service account JSON parsed successfully.",
      `\n  project_id : ${credentials.project_id}`,
      `\n  client_email: ${credentials.client_email}\n`
    );
  } catch {
    console.error("GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON.");
    process.exit(1);
  }

  if (!model) {
    console.error("GEMINI_MODEL is not set. Add it to .env or .env.local.");
    process.exit(1);
  }
  console.log(`Model: ${model}\n`);

  // ── 2. Test client initialization ──
  console.log("--- Initializing Gemini client via service account ---");
  const { getGeminiClient, getModel, generateContent } = await import("../lib/gemini");

  const client = getGeminiClient();
  console.log("Client initialized successfully.\n");

  // ── 3. Test simple generateContent call ──
  console.log("--- Testing generateContent() ---");
  try {
    const response = await generateContent("Reply with exactly: SERVICE_ACCOUNT_OK");
    const text = response.text ?? "";
    console.log(`Response: ${text.trim()}\n`);

    if (!text.includes("SERVICE_ACCOUNT_OK")) {
      console.warn("Warning: Response did not contain expected text, but the API call succeeded.\n");
    }
  } catch (error: any) {
    console.error("generateContent() failed:");
    console.error("  Status:", error.status);
    console.error("  Message:", error.message);
    if (error.errorDetails) {
      console.error("  Details:", JSON.stringify(error.errorDetails, null, 2));
    }
    process.exit(1);
  }

  // ── 4. Test streaming call (mirrors chat route) ──
  console.log("--- Testing generateContentStream() ---");
  try {
    const ai = getGeminiClient();
    const streamResponse = await ai.models.generateContentStream({
      model: getModel(),
      contents: "Reply with exactly: STREAM_OK",
    });

    let streamText = "";
    for await (const chunk of streamResponse) {
      const part = chunk.text ?? "";
      streamText += part;
    }
    console.log(`Streamed response: ${streamText.trim()}\n`);

    if (!streamText.includes("STREAM_OK")) {
      console.warn("Warning: Streamed response did not contain expected text, but streaming worked.\n");
    }
  } catch (error: any) {
    console.error("generateContentStream() failed:");
    console.error("  Status:", error.status);
    console.error("  Message:", error.message);
    if (error.errorDetails) {
      console.error("  Details:", JSON.stringify(error.errorDetails, null, 2));
    }
    process.exit(1);
  }

  console.log("=== All tests passed ===");
}

testGcpAuth();
