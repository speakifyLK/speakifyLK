"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import db from "@/db/drizzle";
import { chatConversations, chatMessages } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const MAX_CONTENT_LENGTH = 4000;

function validateMessageContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("Message content cannot be empty.");
  }
  if (trimmed.length > MAX_CONTENT_LENGTH) {
    throw new Error("Message content is too long.");
  }
  return trimmed;
}

async function assertConversationOwner(conversationId: number, userId: string) {
  const conversation = await db.query.chatConversations.findFirst({
    where: (table, { and, eq }) => and(
      eq(table.id, conversationId),
      eq(table.userId, userId)
    ),
  });

  if (!conversation) {
    throw new Error("Unauthorized.");
  }
  
  return conversation;
}

export const createConversation = async () => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");

  const [conversation] = await db.insert(chatConversations).values({
    userId,
    title: "New Conversation",
  }).returning();

  revalidatePath("/chat");
  return conversation.id;
};


export const sendMessage = async (conversationId: number, content: string) => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");

  await assertConversationOwner(conversationId, userId);

  const trimmedContent = validateMessageContent(content);

  const [message] = await db.insert(chatMessages).values({
    conversationId,
    role: "user",
    content: trimmedContent,
  }).returning();

  await db.update(chatConversations)
    .set({ updatedAt: new Date() })
    .where(eq(chatConversations.id, conversationId));

  revalidatePath("/chat");
  return message;
};


export const saveAssistantMessage = async (conversationId: number, content: string) => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");

  await assertConversationOwner(conversationId, userId);

  const trimmedContent = validateMessageContent(content);

  await db.insert(chatMessages).values({
    conversationId,
    role: "assistant",
    content: trimmedContent,
  });
  await db.update(chatConversations)
    .set({ updatedAt: new Date() })
    .where(eq(chatConversations.id, conversationId));

  revalidatePath("/chat");
};


export const deleteConversation = async (conversationId: number) => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");

  await assertConversationOwner(conversationId, userId);
  await db.delete(chatConversations).where(
    and(
      eq(chatConversations.id, conversationId),
      eq(chatConversations.userId, userId)
    )
  );

  revalidatePath("/chat");
};


export const getOrCreateConversation = async () => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized.");

  const existingConversation = await db.query.chatConversations.findFirst({
    where: (table, { eq }) => eq(table.userId, userId),
    orderBy: (table, { desc }) => [desc(table.updatedAt)],
  });

  const conversationId = existingConversation?.id ?? await createConversation();

  revalidatePath("/chat");
  return conversationId;
};