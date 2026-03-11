"use client";

import { useEffect, useState } from "react";
import { ChatWindow } from "@/components/chat/chat-window";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { getOrCreateConversation, getMessages } from "@/actions/chat";
import { toast } from "sonner";

export default function ChatPage() {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string; createdAt: Date; timestamp?: Date }[]
  >([]);
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

    // Optimistically update UI with user message
    const userMsg = { role: "user" as const, content: text, createdAt: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    // Add an empty assistant bubble that we'll stream into
    const assistantMsg = { role: "assistant" as const, content: "", createdAt: new Date() };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        // Update the last message (assistant bubble) with streamed text
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullText,
          };
          return updated;
        });
      }

      // Flush any remaining buffered bytes (e.g. partial multi-byte Sinhala characters)
      const remaining = decoder.decode();
      if (remaining) {
        fullText += remaining;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullText,
          };
          return updated;
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to get AI response");
      // Remove the empty assistant bubble on error
      setMessages((prev) => prev.filter((msg) => msg.content !== ""));
    } finally {
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
