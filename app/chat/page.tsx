"use client";

import { useEffect, useState, useRef } from "react";
import { ChatWindow } from "@/components/chat/chat-window";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { getOrCreateConversation, getMessages, sendMessage } from "@/actions/chat";
import { toast } from "sonner";

export default function ChatPage() {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; createdAt: Date; timestamp?: Date }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load history on mount
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

  // 4. Handle sending messages
  const handleSendMessage = async (text: string) => {
    if (!conversationId) return;

    // Optimistically update UI
    const userMsg = { role: "user" as const, content: text, createdAt: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      // Save to Database via Server Action
      await sendMessage(conversationId, text);

      // TODO: Call Gemini API for response in the next task
      setTimeout(() => setIsGenerating(false), 1000);
      
    } catch (error) {
      toast.error("Failed to send message");
      setIsGenerating(false);
    }
  };

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

      {/* 5. Render the ChatInput with required props */}
      <ChatInput onSend={handleSendMessage} isLoading={isGenerating} />
    </div>
  );
}