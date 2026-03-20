import { auth } from "@clerk/nextjs/server";
import { getGeminiClient, getModel, safetySettings, generationConfig } from "@/lib/gemini";
import { SINHALA_TUTOR_PROMPT } from "@/lib/chat-prompt";
import { sendMessage, saveAssistantMessage, getMessages } from "@/actions/chat";
import { getUserProgress, getUnits, getUserSubscription } from "@/db/queries";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // ── 1. Authenticate ──
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Rate limiting (free users: 20/hr, subscribers: unlimited) ──
  try {
    const subscription = await getUserSubscription();
    if (!subscription?.isActive) {
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
  } catch (err) {
    // Non-critical — allow the request if subscription check fails
    console.error(`[Chat] Subscription check failed | userId: ${userId}`, err);
  }

  // ── 3. Parse request body ──
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

  // ── 7. Format history for Gemini ──
  const geminiHistory = history.map((msg) => ({
    role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: msg.content }],
  }));

  // ── 8. Call Gemini with streaming ──
  try {
    const ai = getGeminiClient();

    const response = await ai.models.generateContentStream({
      model: getModel(),
      contents: [
        { role: "user", parts: [{ text: SINHALA_TUTOR_PROMPT + courseContext }] },
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

    // ── 9. Stream response to client ──
    let fullResponse = "";
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.text ?? "";
            if (text) {
              fullResponse += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          // ── 10. Save complete assistant response to DB ──
          if (fullResponse.trim()) {
            await saveAssistantMessage(conversationId, fullResponse);
          }

          controller.close();
        } catch (err) {
          console.error(
            `[Chat] Gemini streaming error | userId: ${userId} | time: ${new Date().toISOString()}`,
            err
          );
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error(
      `[Chat] Gemini API failure | userId: ${userId} | time: ${new Date().toISOString()}`,
      err
    );
    return Response.json(
      { error: "AI service temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}
