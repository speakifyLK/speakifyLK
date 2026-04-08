"use client";

import { Bot } from "lucide-react";
import { format, isValid } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp: Date | string;
}

/**
 * Formats a single line or segment of the chat message.
 * Supports patterns:
 * 1. Sinhala phrase: Sinhala script (transliteration) [meaning]
 * 2. Correction: ✏️ Let's refine that: [wrong] -> [correct]
 * 3. Vocabulary: 📖 New word: [script] ([transliteration]) — [meaning]
 */
const FormattedMessagePart = ({ text, isUser }: { text: string; isUser: boolean }) => {
  // 1. Correction Block: ✏️ Let's refine that: [wrong] -> [correct]
  if (text.includes("✏️")) {
    const parts = text.split(/✏️\s*Let's refine that:\s*|→/);
    if (parts.length >= 2) {
      const wrong = parts[1]?.trim();
      const correct = parts[2]?.trim();
      return (
        <div className="my-2 space-y-1 rounded-lg border border-yellow-200 bg-yellow-50 p-2 text-zinc-800">
          <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-700">
            <span>✏️</span>
            <span>LET'S REFINE THAT</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="line-through opacity-50">{wrong}</span>
            <span className="text-zinc-400">→</span>
            <span className="font-semibold text-green-700">{correct}</span>
          </div>
        </div>
      );
    }
  }

  // 2. Vocabulary Block: 📖 New word: [script] ([transliteration]) — [meaning]
  if (text.includes("📖") || text.includes("New word:")) {
    const mainMatch = text.match(/📖\s*New word:\s*(.+?)\s*\((.+?)\)\s*(?:—|-)\s*(.+)/i);
    if (mainMatch) {
      const [, script, translit, meaning] = mainMatch;
      return (
        <div className="my-2 space-y-1 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-zinc-800">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500">
            <span>📖</span>
            <span>LEARNING POINT</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="font-['Noto_Sans_Sinhala'] text-xl font-bold text-indigo-900">
                {script}
              </span>
              <span className="text-sm italic text-indigo-400 opacity-80">({translit})</span>
            </div>
            <div className="text-sm font-medium text-indigo-700">
              {meaning.replace(/^—\s*|^-\s*/, "")}
            </div>
          </div>
        </div>
      );
    }
  }

  // 3. Spoken Sinhala Format: Script (transliteration) [meaning]
  // Using a more robust regex to catch "Script (translit) [meaning]"
  const parts = text.split(/(\S.*?\s*\([^)]+\)\s*\[[^\]]+\])/g);
  if (parts.length > 1) {
    return (
      <span className="flex flex-wrap items-baseline gap-x-1.5 leading-relaxed">
        {parts.map((part, i) => {
          const match = part.match(/(.+?)\s*\((.+?)\)\s*\[(.+?)\]/);
          if (match) {
            const [, script, translit, meaning] = match;
            return (
              <span key={i} className="inline-flex flex-col py-1 align-top">
                <span className="flex items-baseline gap-x-2">
                  <span className="font-['Noto_Sans_Sinhala'] text-lg font-bold text-zinc-900 md:text-xl">
                    {script}
                  </span>
                  <span className="text-xs italic text-zinc-400 md:text-sm">({translit})</span>
                </span>
                <span className="text-xs font-medium text-zinc-500 md:text-sm">[{meaning}]</span>
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  }

  // Fallback for plain text
  return <span className={isUser ? "text-white" : "text-zinc-700"}>{text}</span>;
};

export const ChatBubble = ({ role, content, timestamp }: ChatBubbleProps) => {
  const isUser = role === "user";

  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const formattedTime = isValid(date) ? format(date, "p") : "";

  // Split lines to process them individually
  const lines = content.split("\n");

  return (
    <div
      className={cn("mb-6 flex w-full items-end gap-x-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {!isUser && (
        <Avatar className="h-9 w-9 shrink-0 border-2 border-green-200 bg-white ring-2 ring-green-100/50">
          <AvatarImage src="/bot.svg" />
          <AvatarFallback className="bg-green-50">
            <Bot className="h-5 w-5 text-green-600" />
          </AvatarFallback>
        </Avatar>
      )}

      {isUser && <div className="w-9" />}

      <div className={cn("flex max-w-[85%] flex-col", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "relative flex flex-col space-y-1 overflow-hidden p-4 shadow-md",
            isUser
              ? "rounded-2xl rounded-br-sm bg-green-500 text-white"
              : "rounded-2xl rounded-bl-sm border border-emerald-100 bg-white"
          )}
        >
          {lines.map((line, idx) => (
            <div key={idx} className="min-h-[1.5rem]">
              <FormattedMessagePart text={line} isUser={isUser} />
            </div>
          ))}
        </div>

        <span className="mt-1.5 px-2 text-[10px] font-medium uppercase tracking-tight text-zinc-400">
          {formattedTime}
        </span>
      </div>
    </div>
  );
};
