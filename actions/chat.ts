"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import db from "@/db/drizzle";
import { chatConversations, chatMessages } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function assertConversationOwner(conversationId: number, userId: string) {
  const conversation = await db.query.chatConversations.findFirst({
    where: (table, { and, eq }) => and(eq(table.id, conversationId), eq(table.userId, userId)),
  });

  if (!conversation) {
    throw new Error("Unauthorized.");
  }

  return conversation;
}

/**
 * Internal helper that inserts a conversation row without revalidating.
 * Used by both createConversation (client action) and getOrCreateConversation.
 */
async function insertConversation(userId: string): Promise<number> {
  const [conversation] = await db
    .insert(chatConversations)
    .values({
      userId,
      title: "New Conversation",
    })
    .returning();

  return conversation.id;
}

export const createConversation = async () => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");

  const id = await insertConversation(userId);
  revalidatePath("/chat");
  return id;
};

export const sendMessage = async (conversationId: number, content: string) => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");

  await assertConversationOwner(conversationId, userId);

  // 1. Insert the message
  const [message] = await db
    .insert(chatMessages)
    .values({
      conversationId,
      role: "user",
      content,
    })
    .returning();

  // 2. Fetch the conversation to check if it needs a title update
  const conversation = await db.query.chatConversations.findFirst({
    where: eq(chatConversations.id, conversationId),
  });

  // 3. Logic: If title is "New Chat" or null, update it with the first message
  const shouldUpdateTitle = !conversation?.title || conversation.title === "New Conversation";

  const truncatedTitle = content.length > 40 ? content.substring(0, 40) + "..." : content;

  await db
    .update(chatConversations)
    .set({
      updatedAt: new Date(),
      ...(shouldUpdateTitle && { title: truncatedTitle }), // Only update title if necessary
    })
    .where(eq(chatConversations.id, conversationId));

  revalidatePath("/chat");
  return message;
};

export const saveAssistantMessage = async (conversationId: number, content: string) => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");

  await assertConversationOwner(conversationId, userId);

  await db.insert(chatMessages).values({
    conversationId,
    role: "assistant",
    content,
  });
  await db
    .update(chatConversations)
    .set({ updatedAt: new Date() })
    .where(eq(chatConversations.id, conversationId));

  revalidatePath("/chat");
};

export const deleteConversation = async (conversationId: number) => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");

  await assertConversationOwner(conversationId, userId);

  // Prevent deleting the last conversation — user must always have at least one
  const allConversations = await db.query.chatConversations.findMany({
    where: (table, { eq }) => eq(table.userId, userId),
  });

  if (allConversations.length <= 1) {
    throw new Error("Cannot delete your only conversation.");
  }

  await db
    .delete(chatConversations)
    .where(and(eq(chatConversations.id, conversationId), eq(chatConversations.userId, userId)));

  revalidatePath("/chat");
};

export const getOrCreateConversation = async () => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");

  const existingConversation = await db.query.chatConversations.findFirst({
    where: (table, { eq }) => eq(table.userId, userId),
    orderBy: (table, { desc }) => [desc(table.updatedAt)],
  });

  if (existingConversation) {
    return existingConversation.id;
  }

  // No revalidation here — the page is loading for the first time and will
  // render with the freshly-created conversation in the same request.
  return await insertConversation(userId);
};

/**
 * Retrieves all messages for a specific conversation.
 */
export const getMessages = async (conversationId: number) => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");

  // Security: Check ownership
  await assertConversationOwner(conversationId, userId);

  const messages = await db.query.chatMessages.findMany({
    where: eq(chatMessages.conversationId, conversationId),
    orderBy: (table, { asc }) => [asc(table.timestamp)], // Show oldest to newest
  });

  return messages;
};
