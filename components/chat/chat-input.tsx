"use client";

import { useState, KeyboardEvent } from "react";
import { SendHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
//import { noto_sinhala } from "@/lib/fonts";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

export const ChatInput = ({ onSend, isLoading }: ChatInputProps) => {
  const [content, setContent] = useState("");

  const handleSend = () => {
    //Prevent submission of empty messages
    if (!content.trim() || isLoading) return;
    onSend(content);
    setContent("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    //Support submission via Enter key
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full border-t border-green-100 bg-white p-3">
      <div className="relative mx-auto flex max-w-3xl items-end gap-x-2">
        <Textarea
          disabled={isLoading}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your message in Sinhala or English..."
          className={cn(
            "max-h-[150px] min-h-[44px] resize-none rounded-xl py-3 pr-12",
            //noto_sinhala.className, // Requirement: Support Sinhala characters
            "border-green-200 text-sm focus-visible:ring-green-500 lg:text-base"
          )}
        />
        <Button
          onClick={handleSend}
          disabled={isLoading || !content.trim()}
          size="icon"
          className={cn(
            "absolute bottom-2 right-2 h-8 w-8 rounded-lg bg-green-500 transition-all hover:bg-green-600",
            isLoading && "animate-pulse"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <SendHorizontal className="h-5 w-5 text-white" />
          )}
        </Button>
      </div>
    </div>
  );
};
