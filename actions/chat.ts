"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import  db from "@/db/drizzle";
import { chatConversations, chatMessages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

//Creates a new conversation for the authenticated user.
export const createConversation = async () => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [conversation] = await db.insert(chatConversations).values({
    userId,
  }).returning();

  revalidatePath("/chatbot");
  return conversation.id;
};


 //Saves a user message to the database
export const sendMessage = async (conversationId: number, content: string) => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [message] = await db.insert(chatMessages).values({
    conversationId,
    role: "user",
    content,
  }).returning();

  revalidatePath("/chatbot");
  return message;
};

 //Saves the AI's response to the database.
export const saveAssistantMessage = async (conversationId: number, content: string) => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.insert(chatMessages).values({
    conversationId,
    role: "assistant",
    content,
  });

  revalidatePath("/chatbot");
};


//Deletes a conversation and all its messages.
export const deleteConversation = async (conversationId: number) => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.delete(chatConversations).where(eq(chatConversations.id, conversationId));

  revalidatePath("/chatbot");
};


 //Retrieves the most recent conversation or creates a new one.
export const getOrCreateConversation = async () => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const existingConversation = await db.query.chatConversations.findFirst({
    where: eq(chatConversations.userId, userId),
    orderBy: [desc(chatConversations.createdAt)],
  });

  if (existingConversation) return existingConversation.id;

  return await createConversation();
};