"use client";

import { useEffect, useState } from "react";
import { ChatWindow } from "@/components/chat/chat-window";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { getOrCreateConversation, getMessages } from "@/actions/chat";
import { toast } from "sonner";

export default function ChatPage() {
  const [_conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; createdAt: Date; timestamp?: Date }[]>([]);
  const [loading, setLoading] = useState(true);

  // Load the conversation and history when the page opens
  useEffect(() => {
    const initChat = async () => {
      try {
        const id = await getOrCreateConversation();
        setConversationId(id);
        const history = await getMessages(id);
        setMessages(
          history.map((msg) => ({
            role: msg.role,
            content: msg.content,
            createdAt: msg.timestamp,
          }))
        );
      } catch (_error) {
        toast.error("Could not load chat history");
      } finally {
        setLoading(false);
      }
    };
    initChat();
  }, []);

  // const handleSendMessage = async (text: string) => {
  //   if (!conversationId) return;

  //   // 1. Optimistically update UI
  //   const userMsg = { role: "user", content: text, createdAt: new Date() };
  //   setMessages((prev) => [...prev, userMsg]);

  //   try {
  //     // 2. Save to PostgreSQL via Server Action
  //     await sendMessage(conversationId, text);

  //     // 3. Trigger your AI logic here (e.g., calling Gemini API)
  //   } catch (error) {
  //     toast.error("Failed to send message");
  //   }
  // };

  if (loading) return <div>Loading Tutor...</div>;

  return (
    <div className="mx-auto flex h-[calc(100vh-80px)] max-w-2xl flex-col p-4">
      <h1 className="mb-4 text-center text-2xl font-bold">AI Sinhala Tutor</h1>

      <ChatWindow>
        <div className="flex flex-col gap-y-2">
          {messages.map((msg, index) => (
            <ChatBubble
              key={index}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp || msg.createdAt}
            />
          ))}
        </div>
      </ChatWindow>

      {/* <ChatInput onSend={handleSendMessage} /> */}
    </div>
  );
}
