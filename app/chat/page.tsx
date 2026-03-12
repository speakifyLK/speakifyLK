"use client";

import { useEffect, useState, useCallback } from "react";
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

  // Use useCallback so we can reference this safely in the Retry action
  const startStreaming = useCallback(async (convId: number, text: string) => {
    setIsGenerating(true);

    // Add a placeholder assistant message
    setMessages((prev) => [
      ...prev,
      { role: "assistant" as const, content: "", createdAt: new Date() },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, message: text }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: Failed to connect to tutor`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response stream");

      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        fullText += decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullText,
          };
          return updated;
        });
      }

      // Final flush for Sinhala characters
      const remaining = decoder.decode();
      if (remaining) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullText + remaining,
          };
          return updated;
        });
      }
    } catch (_error) {
      // Remove the empty/failed assistant bubble
      setMessages((prev) => prev.slice(0, -1));

      //Sonner toast with Retry button
      toast.error("Tutor connection failed", {
        description: "Could not get a response. Try again?",
        action: {
          label: "Retry",
          onClick: () => startStreaming(convId, text),
        },
      });
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!conversationId) return;

    // Optimistically add User message only
    const userMsg = { role: "user" as const, content: text, createdAt: new Date() };
    setMessages((prev) => [...prev, userMsg]);

    // Start the AI stream
    await startStreaming(conversationId, text);
  };

  if (loading)
    return <div className="flex h-full items-center justify-center">Loading Tutor...</div>;

  return (
    // Fixed: Changed p-4 to pt-4 px-4 pb-0 to remove bottom padding
    // Added overflow-hidden to prevent the whole page from scrolling
    <div className="mx-auto flex h-[calc(100vh-40px)] max-w-4xl flex-col overflow-hidden px-4 pb-0 pt-4">
      <h1 className="mb-2 text-center text-2xl font-bold">AI Sinhala Tutor</h1>

      {/* The ChatWindow now takes all available space between the header and input */}
      <ChatWindow isEmpty={messages.length === 0} isTyping={isGenerating}>
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

      {/* Pushes the input to the very bottom of the container */}
      <div className="mt-auto">
        <ChatInput onSend={handleSendMessage} isLoading={isGenerating} />
      </div>
    </div>
  );
}
