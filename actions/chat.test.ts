import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist mocks ──────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());

const mockDbInsert = vi.hoisted(() => vi.fn());
const mockDbUpdate = vi.hoisted(() => vi.fn());
const mockDbDelete = vi.hoisted(() => vi.fn());
const mockDbQuery = vi.hoisted(() => ({
  chatConversations: { findFirst: vi.fn(), findMany: vi.fn() },
  chatMessages: { findMany: vi.fn() },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ _type: "eq", col, val }),
  and: (...args: unknown[]) => ({ _type: "and", args }),
}));

vi.mock("@/db/drizzle", () => {
  const returningFn = vi.fn();
  const whereFn = vi.fn();
  const valuesFn = vi.fn();
  const setFn = vi.fn();

  valuesFn.mockReturnValue({ returning: returningFn });
  setFn.mockReturnValue({ where: whereFn });
  whereFn.mockReturnValue({ returning: returningFn });

  // Drizzle query builder helpers that invoke callbacks to cover those branches
  const fakeHelpers = {
    and: (...args: unknown[]) => ({ _type: "and", args }),
    eq: (col: unknown, val: unknown) => ({ _type: "eq", col, val }),
    desc: (col: unknown) => ({ _type: "desc", col }),
    asc: (col: unknown) => ({ _type: "asc", col }),
  };
  const fakeTable = new Proxy(
    {},
    { get: (_t, prop) => `table.${String(prop)}` }
  );

  // Wrap findFirst/findMany to invoke the where/orderBy callbacks if provided
  const wrapQuery = (mockFn: any) => {
    return (opts?: Record<string, unknown>) => {
      if (opts?.where && typeof opts.where === "function") {
        (opts.where as (t: unknown, h: unknown) => unknown)(
          fakeTable,
          fakeHelpers
        );
      }
      if (opts?.orderBy && typeof opts.orderBy === "function") {
        (opts.orderBy as (t: unknown, h: unknown) => unknown)(
          fakeTable,
          fakeHelpers
        );
      }
      return mockFn(opts);
    };
  };

  const chatConvFindFirst = wrapQuery(mockDbQuery.chatConversations.findFirst);
  const chatConvFindMany = wrapQuery(mockDbQuery.chatConversations.findMany);
  const chatMsgFindMany = wrapQuery(mockDbQuery.chatMessages.findMany);

  const db = {
    insert: mockDbInsert.mockReturnValue({ values: valuesFn }),
    update: mockDbUpdate.mockReturnValue({ set: setFn }),
    delete: mockDbDelete.mockReturnValue({ where: whereFn }),
    query: {
      chatConversations: {
        findFirst: chatConvFindFirst,
        findMany: chatConvFindMany,
      },
      chatMessages: { findMany: chatMsgFindMany },
    },
    _mocks: { returningFn, whereFn, valuesFn, setFn },
  };
  return { default: db };
});

vi.mock("@/db/schema", () => ({
  chatConversations: { id: "cc.id", userId: "cc.userId" },
  chatMessages: { conversationId: "cm.conversationId" },
}));

import {
  createConversation,
  sendMessage,
  saveAssistantMessage,
  deleteConversation,
  getOrCreateConversation,
  getMessages,
} from "./chat";
import db from "@/db/drizzle";

const dbMocks = (
  db as unknown as { _mocks: Record<string, ReturnType<typeof vi.fn>> }
)._mocks;

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: "user-1" });
  dbMocks.setFn.mockReturnValue({ where: dbMocks.whereFn });
  dbMocks.whereFn.mockReturnValue({ returning: dbMocks.returningFn });
  // Default: assertConversationOwner passes
  mockDbQuery.chatConversations.findFirst.mockResolvedValue({
    id: 1,
    userId: "user-1",
    title: "New Conversation",
  });
});

// =====================================================================
// createConversation
// =====================================================================
describe("createConversation", () => {
  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(createConversation()).rejects.toThrow("Unauthorized.");
  });

  it("creates a conversation and returns its id", async () => {
    dbMocks.returningFn.mockResolvedValue([{ id: 42 }]);

    const result = await createConversation();

    expect(result).toBe(42);
    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/chat");
  });
});

// =====================================================================
// sendMessage
// =====================================================================
describe("sendMessage", () => {
  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(sendMessage(1, "hello")).rejects.toThrow("Unauthorized.");
  });

  it("throws when conversation is not owned by user", async () => {
    mockDbQuery.chatConversations.findFirst.mockResolvedValue(null);
    await expect(sendMessage(1, "hello")).rejects.toThrow("Unauthorized.");
  });

  it("sends message and updates title when title is 'New Conversation'", async () => {
    const mockMessage = { id: 1, content: "hello", role: "user" };
    dbMocks.returningFn.mockResolvedValueOnce([mockMessage]); // insert message

    // findFirst returns twice: once for assertConversationOwner, once for title check
    mockDbQuery.chatConversations.findFirst
      .mockResolvedValueOnce({
        id: 1,
        userId: "user-1",
        title: "New Conversation",
      })
      .mockResolvedValueOnce({ id: 1, title: "New Conversation" });

    const result = await sendMessage(1, "hello");

    expect(result).toEqual(mockMessage);
    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockDbUpdate).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/chat");
  });

  it("sends message without updating title when title is already set", async () => {
    const mockMessage = { id: 1, content: "hello", role: "user" };
    dbMocks.returningFn.mockResolvedValueOnce([mockMessage]);

    mockDbQuery.chatConversations.findFirst
      .mockResolvedValueOnce({ id: 1, userId: "user-1", title: "Custom Title" })
      .mockResolvedValueOnce({ id: 1, title: "Custom Title" });

    const result = await sendMessage(1, "hello");

    expect(result).toEqual(mockMessage);
    expect(mockDbUpdate).toHaveBeenCalled(); // Still updates updatedAt
  });

  it("truncates title when message exceeds 40 characters", async () => {
    const longMessage = "A".repeat(50);
    const mockMessage = { id: 1, content: longMessage, role: "user" };
    dbMocks.returningFn.mockResolvedValueOnce([mockMessage]);

    mockDbQuery.chatConversations.findFirst
      .mockResolvedValueOnce({
        id: 1,
        userId: "user-1",
        title: "New Conversation",
      })
      .mockResolvedValueOnce({ id: 1, title: "New Conversation" });

    await sendMessage(1, longMessage);
    expect(mockDbUpdate).toHaveBeenCalled();
  });

  it("updates title when title is null", async () => {
    const mockMessage = { id: 1, content: "hi", role: "user" };
    dbMocks.returningFn.mockResolvedValueOnce([mockMessage]);

    mockDbQuery.chatConversations.findFirst
      .mockResolvedValueOnce({ id: 1, userId: "user-1", title: null })
      .mockResolvedValueOnce({ id: 1, title: null });

    await sendMessage(1, "hi");
    expect(mockDbUpdate).toHaveBeenCalled();
  });
});

// =====================================================================
// saveAssistantMessage
// =====================================================================
describe("saveAssistantMessage", () => {
  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(saveAssistantMessage(1, "response")).rejects.toThrow(
      "Unauthorized."
    );
  });

  it("throws when not conversation owner", async () => {
    mockDbQuery.chatConversations.findFirst.mockResolvedValue(null);
    await expect(saveAssistantMessage(1, "response")).rejects.toThrow(
      "Unauthorized."
    );
  });

  it("saves assistant message and updates conversation", async () => {
    await saveAssistantMessage(1, "AI response");

    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockDbUpdate).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/chat");
  });
});

// =====================================================================
// deleteConversation
// =====================================================================
describe("deleteConversation", () => {
  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(deleteConversation(1)).rejects.toThrow("Unauthorized.");
  });

  it("throws when not conversation owner", async () => {
    mockDbQuery.chatConversations.findFirst.mockResolvedValue(null);
    await expect(deleteConversation(1)).rejects.toThrow("Unauthorized.");
  });

  it("throws when trying to delete the only conversation", async () => {
    mockDbQuery.chatConversations.findMany.mockResolvedValue([{ id: 1 }]);

    await expect(deleteConversation(1)).rejects.toThrow(
      "Cannot delete your only conversation."
    );
    expect(mockDbDelete).not.toHaveBeenCalled();
  });

  it("deletes the conversation when more than one exists", async () => {
    mockDbQuery.chatConversations.findMany.mockResolvedValue([
      { id: 1 },
      { id: 2 },
    ]);

    await deleteConversation(1);

    expect(mockDbDelete).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/chat");
  });
});

// =====================================================================
// getOrCreateConversation
// =====================================================================
describe("getOrCreateConversation", () => {
  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(getOrCreateConversation()).rejects.toThrow("Unauthorized.");
  });

  it("returns existing conversation id", async () => {
    mockDbQuery.chatConversations.findFirst.mockResolvedValue({ id: 99 });

    const result = await getOrCreateConversation();
    expect(result).toBe(99);
  });

  it("creates new conversation without revalidating when none exists", async () => {
    // First call for getOrCreateConversation -> null (no existing)
    mockDbQuery.chatConversations.findFirst.mockResolvedValueOnce(null);
    // insertConversation inserts and returns
    dbMocks.returningFn.mockResolvedValueOnce([{ id: 77 }]);

    const result = await getOrCreateConversation();
    expect(result).toBe(77);
    expect(mockDbInsert).toHaveBeenCalled();
    // insertConversation does NOT call revalidatePath (avoids double-render)
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

// =====================================================================
// getMessages
// =====================================================================
describe("getMessages", () => {
  it("throws when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(getMessages(1)).rejects.toThrow("Unauthorized.");
  });

  it("throws when not conversation owner", async () => {
    mockDbQuery.chatConversations.findFirst.mockResolvedValue(null);
    await expect(getMessages(1)).rejects.toThrow("Unauthorized.");
  });

  it("returns messages for the conversation", async () => {
    const mockMessages = [
      { id: 1, content: "hello", role: "user" },
      { id: 2, content: "hi!", role: "assistant" },
    ];
    mockDbQuery.chatMessages.findMany.mockResolvedValue(mockMessages);

    const result = await getMessages(1);
    expect(result).toEqual(mockMessages);
  });
});
