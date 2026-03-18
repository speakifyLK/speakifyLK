"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

import { ChatWindow } from "@/components/chat/chat-window";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { ChatInput } from "@/components/chat/chat-input";

interface UserProgress {
  points: number;
  hearts: number;
  activeCourseId?: number | null;
}

interface ChatClientProps {
  initialMessages: {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }[];
  conversationId: number;
  userProgress: UserProgress;
}

export const ChatClient = ({ initialMessages, conversationId, userProgress }: ChatClientProps) => {
  const [messages, setMessages] = useState(initialMessages);
  const [isGenerating, setIsGenerating] = useState(false);

  const startStreaming = useCallback(async (convId: number, text: string) => {
    setIsGenerating(true);

    // Add a placeholder assistant message for the stream to fill
    setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: new Date() }]);

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

        // Real-time UI update for the streaming assistant response
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: fullText,
          };
          return updated;
        });
      }

      // Final flush for multi-byte Sinhala characters
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
      // Remove the failed placeholder bubble
      setMessages((prev) => prev.slice(0, -1));

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

  // chat-client.tsx — updated handleSendMessage
  const handleSendMessage = async (text: string) => {
    if (!conversationId || isGenerating) return;

    if (userProgress && userProgress.hearts === 0) {
      toast.error("You have no hearts left!", {
        description: "Visit the shop to refill your hearts and continue practicing.",
      });
      return;
    }

    // Optimistically add user message to UI
    const userMsg = {
      role: "user" as const,
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Stream AI response (route.ts saves user message + assistant message)
    await startStreaming(conversationId, text);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-40px)] max-w-4xl flex-col overflow-hidden px-4 pb-0 pt-4">
      <h1 className="mb-2 text-center text-2xl font-bold">AI Sinhala Tutor</h1>

      <ChatWindow isEmpty={messages.length === 0} isTyping={isGenerating}>
        <div className="flex flex-col gap-y-2">
          {messages.map((msg, index) => (
            <ChatBubble
              key={index}
              role={msg.role}
              content={msg.content}
              timestamp={msg.timestamp}
            />
          ))}
        </div>
      </ChatWindow>

      <div className="mt-auto">
        <ChatInput onSend={handleSendMessage} isLoading={isGenerating} />
      </div>
    </div>
  );
};
