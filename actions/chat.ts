"use server";

import { auth,currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import db from "@/db/drizzle";
import { chatConversations, chatMessages } from "@/db/schema";
import { eq, and } from "drizzle-orm";

//Creates a new conversation for the authenticated user.
export const createConversation = async () => {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId || !user) throw new Error("Unauthorized.");

  const [conversation] = await db.insert(chatConversations).values({
    userId,
    title: "New Conversation",
  }).returning();

  revalidatePath("/chat");
  return conversation.id;
};


 //Saves a user message to the database
export const sendMessage = async (conversationId: number, content: string) => {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId || !user) throw new Error("Unauthorized.");

  // 4. Security: Verify conversation ownership
  const conversation = await db.query.chatConversations.findFirst({
    where: (table, { and, eq }) => and(
      eq(table.id, conversationId),
      eq(table.userId, userId)
    ),
  });

  if (!conversation) throw new Error("Unauthorized.");

  const [message] = await db.insert(chatMessages).values({
    conversationId,
    role: "user",
    content,
  }).returning();

  revalidatePath("/chat");
  return message;
};

 //Saves the AI's response to the database.
export const saveAssistantMessage = async (conversationId: number, content: string) => {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId || !user) throw new Error("Unauthorized.");

  // Security: Verify ownership before saving AI response
  const conversation = await db.query.chatConversations.findFirst({
    where: (table, { and, eq }) => and(
      eq(table.id, conversationId),
      eq(table.userId, userId)
    ),
  });

  if (!conversation) throw new Error("Unauthorized.");

  await db.insert(chatMessages).values({
    conversationId,
    role: "assistant",
    content,
  });

  revalidatePath("/chat");
};


//Deletes a conversation and all its messages.
export const deleteConversation = async (conversationId: number) => {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId || !user) throw new Error("Unauthorized.");

  await db.delete(chatConversations).where(
    and(
      eq(chatConversations.id, conversationId),
      eq(chatConversations.userId, userId)
    )
  );

  revalidatePath("/chat");
};


 //Retrieves the most recent conversation or creates a new one.
export const getOrCreateConversation = async () => {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId || !user) throw new Error("Unauthorized.");

  const existingConversation = await db.query.chatConversations.findFirst({
    where: (table, { eq }) => eq(table.userId, userId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  if (existingConversation) return existingConversation.id;

  return await createConversation();
};