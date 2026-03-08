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
    <div className="sticky bottom-0 w-full bg-white border-t p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="max-w-3xl mx-auto flex items-end gap-x-2 relative">
        <Textarea
          disabled={isLoading}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your message in Sinhala or English..."
          className={cn(
            "min-h-[44px] max-h-[150px] resize-none pr-12 py-3",
            //noto_sinhala.className, // Requirement: Support Sinhala characters
            "text-sm lg:text-base border-zinc-200 focus-visible:ring-green-500"
          )}
        />
        <Button
          onClick={handleSend}
          disabled={isLoading || !content.trim()}
          size="icon"
          className={cn(
            "absolute right-2 bottom-2 h-8 w-8 transition-all",
            isLoading && "animate-pulse"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <SendHorizontal className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
};