import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Hoisted mocks ────────────────────────────────────────────────────
const mockRedirect = vi.hoisted(() =>
  vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  })
);
const mockAuth = vi.hoisted(() => vi.fn());
const mockGetUserProgress = vi.hoisted(() => vi.fn());
const mockGetConversations = vi.hoisted(() => vi.fn());
const mockGetConversationById = vi.hoisted(() => vi.fn());
const mockGetOrCreateConversation = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: (fn: any) => fn,
  };
});

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

vi.mock("@/db/queries", () => ({
  getUserProgress: mockGetUserProgress,
  getConversations: mockGetConversations,
  getConversationById: mockGetConversationById,
}));

vi.mock("@/actions/chat", () => ({
  getOrCreateConversation: mockGetOrCreateConversation,
}));

vi.mock("./chat-client", () => ({
  ChatClient: ({ initialMessages, conversationId, userProgress }: any) => (
    <div
      data-testid="chat-client"
      data-conversation-id={conversationId}
      data-hearts={userProgress.hearts}
      data-msg-count={initialMessages.length}
    >
      ChatClient
    </div>
  ),
}));

vi.mock("@/components/chat/conversation-list", () => ({
  ConversationList: ({ conversations }: any) => (
    <div data-testid="conversation-list" data-count={conversations.length}>
      {conversations.map((c: any) => (
        <span key={c.id} data-testid={`conv-title-${c.id}`}>
          {c.title}
        </span>
      ))}
    </div>
  ),
}));

// ── Test data ────────────────────────────────────────────────────────
const userProgress = {
  userId: "user_123",
  userName: "Test",
  userImageSrc: "/mascot.svg",
  activeCourseId: 1,
  hearts: 5,
  points: 100,
  activeCourse: { id: 1, title: "Sinhala", imageSrc: "/si.svg" },
};

const activeConversation = {
  id: 42,
  userId: "user_123",
  title: "Convo 42",
  language: "sinhala",
  createdAt: new Date(),
  updatedAt: new Date(),
  messages: [
    { role: "user", content: "Hi", timestamp: new Date("2024-01-01") },
    { role: "assistant", content: "Hello!", timestamp: new Date("2024-01-01") },
  ],
};

const conversations = [
  { id: 42, title: "Convo 42", updatedAt: new Date() },
  { id: 43, title: "Convo 43", updatedAt: new Date() },
];

describe("ChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    // suppress console.log from the page
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("redirects to /sign-in when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const Page = (await import("./page")).default;
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
  });

  it("redirects to /courses when no user progress", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetOrCreateConversation.mockResolvedValue(42);
    mockGetConversations.mockResolvedValue(conversations);
    mockGetConversationById.mockResolvedValue(activeConversation);
    mockGetUserProgress.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(mockRedirect).toHaveBeenCalledWith("/courses");
  });

  it("redirects to /courses when no active course", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetOrCreateConversation.mockResolvedValue(42);
    mockGetConversations.mockResolvedValue(conversations);
    mockGetConversationById.mockResolvedValue(activeConversation);
    mockGetUserProgress.mockResolvedValue({
      ...userProgress,
      activeCourse: null,
    });

    const Page = (await import("./page")).default;
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(mockRedirect).toHaveBeenCalledWith("/courses");
  });

  it("redirects to /chat when activeConversation is null", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetOrCreateConversation.mockResolvedValue(42);
    mockGetConversations.mockResolvedValue(conversations);
    mockGetConversationById.mockResolvedValue(null);
    mockGetUserProgress.mockResolvedValue(userProgress);

    const Page = (await import("./page")).default;
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(mockRedirect).toHaveBeenCalledWith("/chat");
  });

  it("renders the chat page with conversation list and client", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetOrCreateConversation.mockResolvedValue(42);
    mockGetConversations.mockResolvedValue(conversations);
    mockGetConversationById.mockResolvedValue(activeConversation);
    mockGetUserProgress.mockResolvedValue(userProgress);

    const Page = (await import("./page")).default;
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByTestId("conversation-list")).toBeInTheDocument();
    expect(screen.getByTestId("chat-client")).toBeInTheDocument();
  });

  it("passes correct message count to ChatClient", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetOrCreateConversation.mockResolvedValue(42);
    mockGetConversations.mockResolvedValue(conversations);
    mockGetConversationById.mockResolvedValue(activeConversation);
    mockGetUserProgress.mockResolvedValue(userProgress);

    const Page = (await import("./page")).default;
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    const client = screen.getByTestId("chat-client");
    expect(client).toHaveAttribute("data-msg-count", "2");
    expect(client).toHaveAttribute("data-conversation-id", "42");
  });

  it("uses searchParams.id when provided", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetConversations.mockResolvedValue(conversations);
    mockGetConversationById.mockResolvedValue(activeConversation);
    mockGetUserProgress.mockResolvedValue(userProgress);

    const Page = (await import("./page")).default;
    const jsx = await Page({ searchParams: Promise.resolve({ id: "42" }) });
    render(jsx);

    // When id is in searchParams, getOrCreateConversation should NOT be called
    expect(mockGetOrCreateConversation).not.toHaveBeenCalled();
    expect(mockGetConversationById).toHaveBeenCalledWith(42);
  });

  it("calls getOrCreateConversation when no id in searchParams", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetOrCreateConversation.mockResolvedValue(42);
    mockGetConversations.mockResolvedValue(conversations);
    mockGetConversationById.mockResolvedValue(activeConversation);
    mockGetUserProgress.mockResolvedValue(userProgress);

    const Page = (await import("./page")).default;
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(mockGetOrCreateConversation).toHaveBeenCalled();
  });

  it("passes conversation count to ConversationList", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetOrCreateConversation.mockResolvedValue(42);
    mockGetConversations.mockResolvedValue(conversations);
    mockGetConversationById.mockResolvedValue(activeConversation);
    mockGetUserProgress.mockResolvedValue(userProgress);

    const Page = (await import("./page")).default;
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByTestId("conversation-list")).toHaveAttribute(
      "data-count",
      "2"
    );
  });

  it("falls back to 'New Conversation' when conversation title is null", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetOrCreateConversation.mockResolvedValue(42);
    mockGetConversations.mockResolvedValue([
      { id: 42, title: null, updatedAt: new Date() },
      { id: 43, title: "Convo 43", updatedAt: new Date() },
    ]);
    mockGetConversationById.mockResolvedValue(activeConversation);
    mockGetUserProgress.mockResolvedValue(userProgress);

    const Page = (await import("./page")).default;
    const jsx = await Page({ searchParams: Promise.resolve({}) });
    render(jsx);

    expect(screen.getByTestId("conv-title-42")).toHaveTextContent(
      "New Conversation"
    );
    expect(screen.getByTestId("conv-title-43")).toHaveTextContent("Convo 43");
  });
});
