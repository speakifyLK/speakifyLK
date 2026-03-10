"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot } from "lucide-react";
import { format, isValid } from "date-fns";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp: Date | string;
}

export const ChatBubble = ({ role, content, timestamp }: ChatBubbleProps) => {
  const isUser = role === "user";

  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const formattedTime = isValid(date) ? format(date, "p") : "";

  return (
    <div
      className={cn(
        "mb-4 flex w-full items-end gap-x-2", // Added items-end for better alignment with avatar
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Assistant Avatar Include a small bot avatar icon */}
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0 border">
          <AvatarImage src="/bot.svg" />
          <AvatarFallback className="bg-slate-200">
            <Bot className="h-5 w-5 text-slate-600" />
          </AvatarFallback>
        </Avatar>
      )}

      {/* Spacing for User messages where there is no avatar */}
      {isUser && <div className="w-8" />}

      <div className={cn("flex max-w-[80%] flex-col", isUser ? "items-end" : "items-start")}>
        {/* Message Bubble */}
        <div
          className={cn(
            "whitespace-pre-wrap break-words p-3 text-sm shadow-sm lg:text-base",
            "font-['Noto_Sans_Sinhala',_sans-serif]",
            isUser
              ? "rounded-2xl rounded-br-sm bg-green-500 text-white"
              : "rounded-2xl rounded-bl-sm bg-gray-100 text-zinc-900"
          )}
        >
          {content}
        </div>

        {/* Timestamp Formatted like '2:30 PM' below bubble */}
        <span className="mt-1 px-1 text-[10px] text-muted-foreground">{formattedTime}</span>
      </div>
    </div>
  );
};
