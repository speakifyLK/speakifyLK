import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

// ── Hoisted mocks ────────────────────────────────────────────────────
const mockToastError = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: vi.fn(),
  },
}));

vi.mock("@/components/chat/chat-window", () => ({
  ChatWindow: ({ children, isEmpty, isTyping }: any) => (
    <div data-testid="chat-window" data-empty={isEmpty} data-typing={isTyping}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/chat/chat-bubble", () => ({
  ChatBubble: ({ role, content }: any) => (
    <div data-testid={`chat-bubble-${role}`}>{content}</div>
  ),
}));

vi.mock("@/components/chat/chat-input", () => ({
  ChatInput: ({ onSend, isLoading }: any) => (
    <div data-testid="chat-input" data-loading={isLoading}>
      <button
        data-testid="send-btn"
        onClick={() => onSend("Hello")}
        disabled={isLoading}
      >
        Send
      </button>
      <button data-testid="send-sinhala-btn" onClick={() => onSend("ආයුබෝවන්")}>
        Send Sinhala
      </button>
    </div>
  ),
}));

import { ChatClient } from "./chat-client";

// ── Helpers ──────────────────────────────────────────────────────────
const baseProps = {
  initialMessages: [
    {
      role: "user" as const,
      content: "Hi there",
      timestamp: new Date("2024-01-01T10:00:00Z"),
    },
    {
      role: "assistant" as const,
      content: "ආයුබෝවන්! How can I help?",
      timestamp: new Date("2024-01-01T10:00:05Z"),
    },
  ],
  conversationId: 1,
  userProgress: { points: 100, hearts: 5, activeCourseId: 1 },
};

function createMockFetchStream(text: string, ok = true, status = 200) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });

  return vi.fn().mockResolvedValue({
    ok,
    status,
    body: stream,
    json: () => Promise.resolve({}),
  });
}

function createMockFetchError(
  status: number,
  errorBody: Record<string, any> = {}
) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    body: null,
    json: () => Promise.resolve(errorBody),
  });
}

describe("ChatClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
      json: () => Promise.resolve({}),
    });
  });

  // ── Rendering ────────────────────────────────────────────────────
  it("renders the title", () => {
    render(<ChatClient {...baseProps} />);
    expect(screen.getByText("AI Sinhala Tutor")).toBeInTheDocument();
  });

  it("renders initial messages", () => {
    render(<ChatClient {...baseProps} />);
    expect(screen.getByText("Hi there")).toBeInTheDocument();
    expect(screen.getByText("ආයුබෝවන්! How can I help?")).toBeInTheDocument();
  });

  it("passes isEmpty=false to ChatWindow when there are messages", () => {
    render(<ChatClient {...baseProps} />);
    const chatWindow = screen.getByTestId("chat-window");
    expect(chatWindow).toHaveAttribute("data-empty", "false");
  });

  it("passes isEmpty=true to ChatWindow when there are no messages", () => {
    render(<ChatClient {...baseProps} initialMessages={[]} />);
    const chatWindow = screen.getByTestId("chat-window");
    expect(chatWindow).toHaveAttribute("data-empty", "true");
  });

  it("renders ChatInput with isLoading=false initially", () => {
    render(<ChatClient {...baseProps} />);
    const chatInput = screen.getByTestId("chat-input");
    expect(chatInput).toHaveAttribute("data-loading", "false");
  });

  // ── Sending messages ─────────────────────────────────────────────
  it("adds user message optimistically on send", async () => {
    global.fetch = createMockFetchStream("Response text");
    render(<ChatClient {...baseProps} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("send-btn"));
    });

    // User message should be shown
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("calls fetch with correct payload", async () => {
    global.fetch = createMockFetchStream("OK");
    render(<ChatClient {...baseProps} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("send-btn"));
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: 1, message: "Hello" }),
    });
  });

  it("streams the AI response into the UI", async () => {
    global.fetch = createMockFetchStream("Streamed response");
    render(<ChatClient {...baseProps} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("send-btn"));
    });

    await waitFor(() => {
      expect(screen.getByText("Streamed response")).toBeInTheDocument();
    });
  });

  // ── Error handling ───────────────────────────────────────────────
  it("shows toast on rate limit (429)", async () => {
    global.fetch = createMockFetchError(429, {
      error: "Rate limited",
      retryAfterSeconds: 1800,
    });
    render(<ChatClient {...baseProps} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("send-btn"));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Message limit reached",
        expect.objectContaining({
          description: expect.stringContaining("30 minutes"),
        })
      );
    });
  });

  it("shows generic error toast on non-429 failure", async () => {
    global.fetch = createMockFetchError(500, { error: "Internal error" });
    render(<ChatClient {...baseProps} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("send-btn"));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Tutor connection failed",
        expect.objectContaining({
          description: "Could not get a response. Try again?",
        })
      );
    });
  });

  it("removes failed assistant placeholder on error", async () => {
    global.fetch = createMockFetchError(500);
    render(<ChatClient {...baseProps} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("send-btn"));
    });

    await waitFor(() => {
      // Only the original 2 messages + the optimistic user message should remain
      // The failed assistant placeholder should have been removed
      const assistantBubbles = screen.getAllByTestId("chat-bubble-assistant");
      // Just the original one
      expect(assistantBubbles).toHaveLength(1);
    });
  });

  // ── Hearts guard ─────────────────────────────────────────────────
  it("shows toast and prevents sending when hearts are 0", async () => {
    render(
      <ChatClient
        {...baseProps}
        userProgress={{ points: 100, hearts: 0, activeCourseId: 1 }}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("send-btn"));
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "You have no hearts left!",
      expect.objectContaining({
        description: expect.stringContaining("Visit the shop"),
      })
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // ── Prevent double send while generating ─────────────────────────
  it("does not send while already generating", async () => {
    // Create a stream that won't resolve immediately
    let resolveStream: (() => void) | undefined;
    const slowStream = new ReadableStream({
      start(controller) {
        resolveStream = () => {
          controller.enqueue(new TextEncoder().encode("slow"));
          controller.close();
        };
      },
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: slowStream,
      json: () => Promise.resolve({}),
    });

    render(<ChatClient {...baseProps} />);

    // Start first send (stream is blocked)
    act(() => {
      fireEvent.click(screen.getByTestId("send-btn"));
    });

    // Try to send again while generating — should be blocked because
    // isGenerating is true and handleSendMessage returns early
    await act(async () => {
      fireEvent.click(screen.getByTestId("send-sinhala-btn"));
    });

    // fetch should have been called only once
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Clean up the stream
    resolveStream?.();
  });

  // ── Conversation switching ───────────────────────────────────────
  it("syncs messages when conversationId changes", () => {
    const { rerender } = render(<ChatClient {...baseProps} />);

    const newMessages = [
      {
        role: "user" as const,
        content: "Different convo",
        timestamp: new Date("2024-02-01T10:00:00Z"),
      },
    ];

    rerender(
      <ChatClient
        initialMessages={newMessages}
        conversationId={2}
        userProgress={baseProps.userProgress}
      />
    );

    expect(screen.getByText("Different convo")).toBeInTheDocument();
    expect(screen.queryByText("Hi there")).not.toBeInTheDocument();
  });

  // ── No reader stream ─────────────────────────────────────────────
  it("handles missing response body (no reader)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
      json: () => Promise.resolve({}),
    });
    render(<ChatClient {...baseProps} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("send-btn"));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Tutor connection failed",
        expect.objectContaining({
          description: "Could not get a response. Try again?",
        })
      );
    });
  });

  // ── 429 without retryAfterSeconds (defaults to 60 min) ──────────
  it("defaults retry time to 60 minutes when retryAfterSeconds is missing", async () => {
    global.fetch = createMockFetchError(429, { error: "rate limit" });
    render(<ChatClient {...baseProps} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("send-btn"));
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Message limit reached",
        expect.objectContaining({
          description: expect.stringContaining("60 minutes"),
        })
      );
    });
  });

  // ── No conversationId guard ──────────────────────────────────────
  it("does not send when conversationId is falsy", async () => {
    render(
      <ChatClient
        initialMessages={[]}
        conversationId={0}
        userProgress={baseProps.userProgress}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("send-btn"));
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
