import { getAuthHeaders } from "@/lib/gcp-auth";

const PROJECT_ID = process.env.GCP_PROJECT_ID!;
const LOCATION = process.env.GCP_LOCATION || "us-west1";
const RAG_CORPUS_ID = process.env.RAG_CORPUS_ID!;
const MODEL_ID = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const VERTEX_BASE = `https://${LOCATION}-aiplatform.googleapis.com/v1`;

// ── Types ──

interface RagChunk {
  text: string;
  source: string;
  score: number;
}

interface RetrieveResponse {
  contexts?: {
    contexts?: Array<{
      text?: string;
      sourceUri?: string;
      score?: number;
    }>;
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Retrieve Context from RAG Corpus ──

/**
 * Calls the Vertex AI RetrieveContexts API to fetch relevant chunks
 * from the RAG corpus based on the user's query.
 *
 * @param query - The user's message to search for relevant context
 * @param corpusId - Optional override for the RAG corpus ID
 * @returns Array of relevant text chunks with source and similarity score
 */
export async function retrieveContext(
  query: string,
  corpusId?: string
): Promise<RagChunk[]> {
  const targetCorpus = corpusId || RAG_CORPUS_ID;

  if (!targetCorpus) {
    console.warn("RAG_CORPUS_ID is not set. Skipping context retrieval.");
    return [];
  }

  const url = `${VERTEX_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}:retrieveContexts`;

  const body = {
    vertex_rag_store: {
      rag_resources: [
        {
          rag_corpus: `projects/${PROJECT_ID}/locations/${LOCATION}/ragCorpora/${targetCorpus}`,
        },
      ],
    },
    query: {
      text: query,
      similarity_top_k: 5,
      vector_distance_threshold: 0.7,
    },
  };

  try {
    const headers = await getAuthHeaders();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`RAG retrieval failed (${response.status}):`, errorText);
      return [];
    }

    const data = (await response.json()) as RetrieveResponse;

    const contexts = data.contexts?.contexts || [];

    return contexts.map((ctx) => ({
      text: ctx.text || "",
      source: ctx.sourceUri || "unknown",
      score: ctx.score || 0,
    }));
  } catch (error) {
    console.error(
      "RAG retrieval error:",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

// Generate with RAG (Streaming)

/**
 * Retrieves relevant context from the RAG corpus, injects it into the
 * system prompt, and calls Gemini via the Vertex AI REST API with
 * streaming enabled.
 *
 * @param messages - The conversation history
 * @param systemPrompt - The base system prompt for the tutor
 * @returns A ReadableStream of the AI response
 */
export async function generateWithRAG(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<ReadableStream<Uint8Array>> {
  // Get the latest user message for context retrieval
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");

  // Retrieve relevant context chunks
  let ragChunks: RagChunk[] = [];
  if (lastUserMessage) {
    ragChunks = await retrieveContext(lastUserMessage.content);
  }

  // Build augmented system prompt with grounding context
  const augmentedPrompt = buildAugmentedPrompt(systemPrompt, ragChunks);

  // Format messages for Gemini API
  const geminiContents = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  // Call Vertex AI Gemini endpoint with streaming
  const url =
    `${VERTEX_BASE}/projects/${PROJECT_ID}/locations/${LOCATION}` +
    `/publishers/google/models/${MODEL_ID}:streamGenerateContent?alt=sse`;

  const body = {
    contents: geminiContents,
    systemInstruction: {
      parts: [{ text: augmentedPrompt }],
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
  };

  const headers = await getAuthHeaders();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Vertex AI API error (${response.status}): ${errorText}`
    );
  }

  if (!response.body) {
    throw new Error("No response stream from Vertex AI");
  }

  // Transform the SSE stream into a plain text stream
  return parseSSEStream(response.body);
}

// ── Helpers ──

/**
 * Injects retrieved RAG chunks into the system prompt as grounding context.
 */
function buildAugmentedPrompt(
  basePrompt: string,
  chunks: RagChunk[]
): string {
  if (chunks.length === 0) {
    return basePrompt;
  }

  const contextBlock = chunks
    .map(
      (chunk, i) =>
        `[Source ${i + 1} | relevance: ${chunk.score.toFixed(2)}]\n${chunk.text}`
    )
    .join("\n\n");

  return `${basePrompt}

---
GROUNDING CONTEXT (from course materials):
Use the following retrieved context to inform your responses. 
Reference this material when relevant, but do not mention the retrieval system to the student.

${contextBlock}
---`;
}

/**
 * Parses a Vertex AI SSE stream and extracts text chunks into a
 * ReadableStream that can be sent directly to the client.
 */
function parseSSEStream(
  sseStream: ReadableStream<Uint8Array>
): ReadableStream<Uint8Array> {
  const reader = sseStream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();

        if (done) {
          controller.close();
          return;
        }

        const text = decoder.decode(value, { stream: true });

        // SSE format: "data: {...}\n\n"
        const lines = text.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed.startsWith("data:")) continue;

          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const content =
              parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";

            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          } catch {
            // Skip malformed JSON chunks (partial SSE data)
          }
        }
      } catch (error) {
        controller.error(error);
      }
    },

    cancel() {
      reader.cancel();
    },
  });
}