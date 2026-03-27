
import { auth } from "@clerk/nextjs/server";
import { SINHALA_TUTOR_PROMPT } from "@/lib/chat-prompt";
import { sendMessage, saveAssistantMessage, getMessages } from "@/actions/chat";
import { getGeminiClient, getModel, safetySettings, generationConfig } from "@/lib/gemini";
import { getUserProgress, getUnits, getUserSubscription } from "@/db/queries";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateWithRAG } from "@/lib/vertex-rag";

/**
 * Helper: Creates a ReadableStream that pipes chunks to the client
 * while accumulating the full response for DB persistence.
 */
function createStreamResponse(
  streamReader: () => AsyncIterable<string>,
  onComplete: (fullText: string) => Promise<void>,
  onError: (err: unknown) => void
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let fullResponse = "";

      try {
        for await (const text of streamReader()) {
          if (text) {
            fullResponse += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        if (fullResponse.trim()) {
          await onComplete(fullResponse);
        }

        controller.close();
      } catch (err) {
        onError(err);
        controller.error(err);
      }
    },
  });
}

export async function POST(req: Request) {
  // ── 1. Authenticate ──
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Parse request body ──
  let conversationId: number;
  let message: string;

  try {
    const body = await req.json();
    const rawConversationId = body.conversationId;
    const parsedConversationId =
      typeof rawConversationId === "string" ? Number(rawConversationId) : rawConversationId;

    if (!Number.isFinite(parsedConversationId) || !Number.isInteger(parsedConversationId)) {
      return Response.json(
        { error: "Invalid conversationId; expected a finite integer" },
        { status: 400 }
      );
    }

    conversationId = parsedConversationId;
    message = body.message;

    if (typeof message !== "string" || !message.trim()) {
      return Response.json({ error: "Missing or invalid message" }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  // ── 3. Rate limiting (free users: 20/hr, subscribers: unlimited) ──
  let isSubscriber = false;
  try {
    const subscription = await getUserSubscription();
    isSubscriber = !!subscription?.isActive;
  } catch (err) {
    // Fail closed — treat as non-subscriber if subscription check fails
    console.error(`[Chat] Subscription check failed | userId: ${userId}`, err);
  }

  if (!isSubscriber) {
    const rateLimitResult = checkRateLimit(userId);
    if (rateLimitResult) {
      return Response.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          retryAfterSeconds: rateLimitResult.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfterSeconds),
          },
        }
      );
    }
  }

  // ── 4. Fetch course context for personalised responses ──
  let courseContext = "";
  try {
    const progress = await getUserProgress();
    if (progress?.activeCourse) {
      const units = await getUnits();

      // Find the current unit (first unit with an incomplete lesson)
      const currentUnit = units.find((unit) => unit.lessons.some((lesson) => !lesson.completed));

      // Get the last 3 completed lesson titles
      const completedLessons = units
        .flatMap((unit) => unit.lessons)
        .filter((lesson) => lesson.completed)
        .slice(-3)
        .map((lesson) => lesson.title);

      const parts: string[] = [];
      parts.push(`The student is currently studying ${progress.activeCourse.title}`);

      if (currentUnit) {
        parts[0] += `, in ${currentUnit.title}`;
      }
      parts[0] += ".";

      if (completedLessons.length > 0) {
        parts.push(
          `The latest completed lessons in the course sequence are: ${completedLessons.join(", ")}.`
        );
      }

      courseContext = "\n\nCOURSE CONTEXT:\n" + parts.join(" ");
    }
  } catch (err) {
    // Non-critical — continue without course context
    console.error("[Chat] Failed to fetch course context:", err);
  }

  // Log the course context for debugging in non-production environments
  if (process.env.NODE_ENV !== "production") {
    console.log("[Chat] Course context:", courseContext || "(none — user has no active course)");
  }

  // ── 5. Save user message to DB ──
  try {
    await sendMessage(conversationId, message);
  } catch (err) {
    console.error(`[Chat] Failed to save user message:`, err);
    return Response.json({ error: "Failed to save message" }, { status: 500 });
  }

  // ── 6. Load conversation history ──
  let history;
  try {
    history = await getMessages(conversationId);
  } catch (err) {
    console.error(`[Chat] Failed to load history:`, err);
    return Response.json({ error: "Failed to load conversation" }, { status: 500 });
  }

  // ── 7. Format history ──
  // For generateWithRAG: { role: "user" | "assistant", content: string }
  const chatHistory = history.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  // For Gemini SDK fallback: { role: "user" | "model", parts: [{ text }] }
  const geminiHistory = history.map((msg) => ({
    role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: msg.content }],
  }));

  const systemPrompt = SINHALA_TUTOR_PROMPT + courseContext;

  const saveResponse = (text: string) => saveAssistantMessage(conversationId, text);
  const logStreamError = (err: unknown) =>
    console.error(
      `[Chat] Streaming error | userId: ${userId} | time: ${new Date().toISOString()}`,
      err
    );

  // ── 8. Try RAG flow, fall back to Gemini SDK on failure ──
  try {
    const ragStream = await generateWithRAG(chatHistory, systemPrompt);

    // RAG succeeded — stream the response
    const stream = createStreamResponse(
      async function* () {
        const reader = ragStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          yield new TextDecoder().decode(value);
        }
      },
      saveResponse,
      logStreamError
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        "X-RAG-Status": "active",
      },
    });
  } catch (ragError) {
    // ── Log RAG failure details ──
    const errorType = ragError instanceof Error ? ragError.constructor.name : typeof ragError;
    const errorMessage = ragError instanceof Error ? ragError.message : String(ragError);
    const statusMatch = errorMessage.match(/\((\d{3})\)/);
    const statusCode = statusMatch ? statusMatch[1] : "unknown";

    console.warn(
      `[Chat] RAG failed, falling back to Gemini SDK | ` +
        `type: ${errorType} | status: ${statusCode} | message: ${errorMessage}`
    );
  }

  // ── 9. Fallback: Non-RAG flow using Gemini SDK ──
  try {
    const ai = getGeminiClient();

    const response = await ai.models.generateContentStream({
      model: getModel(),
      contents: [
        { role: "user", parts: [{ text: systemPrompt }] },
        {
          role: "model",
          parts: [
            { text: "ආයුබෝවන්! (aayubowan!) I'm your Sinhala tutor. How can I help you today?" },
          ],
        },
        ...geminiHistory,
      ],
      config: {
        safetySettings,
        ...generationConfig,
      },
    });

    const stream = createStreamResponse(
      async function* () {
        for await (const chunk of response) {
          yield chunk.text ?? "";
        }
      },
      saveResponse,
      logStreamError
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        "X-RAG-Status": "fallback",
      },
    });
  } catch (err) {
    console.error(
      `[Chat] Gemini SDK fallback also failed | userId: ${userId} | time: ${new Date().toISOString()}`,
      err
    );
    return Response.json(
      { error: "AI service temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}