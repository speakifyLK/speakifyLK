"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MessageSquareQuote } from "lucide-react";
import Link from "next/link";

interface ChatWindowProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  isEmpty: boolean;
  isTyping: boolean;
}

export function ChatWindow({ children, footer, isEmpty, isTyping }: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [children, isTyping]); // Re-scroll when typing starts or messages change

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-md">
      {/* Header — green themed */}
      <div className="flex items-center gap-x-3 border-b bg-green-500 px-3 py-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-green-600"
          asChild
        >
          <Link href="/learn">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <MessageSquareQuote className="h-5 w-5 text-green-100" />
        <h2 className="text-sm font-semibold text-white">Sinhala Tutor</h2>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 bg-green-50/30 p-4">
        {/* Empty State */}
        {isEmpty && (
          <div className="flex h-full flex-col items-center justify-center space-y-3 py-20 text-muted-foreground">
            <div className="rounded-full bg-green-100 p-4">
              <MessageSquareQuote className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-sm font-medium">Start a conversation in Sinhala!</p>
            <p className="text-xs text-muted-foreground">
              Your AI tutor is ready to help you practice
            </p>
          </div>
        )}

        <div className="flex flex-col gap-y-2">
          {children}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-x-2 p-2 text-muted-foreground">
              <div className="flex gap-x-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-400 [animation-delay:-0.3s]"></span>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-400 [animation-delay:-0.15s]"></span>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-green-400"></span>
              </div>
              <span className="text-xs italic">Tutor is typing...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area — inside the card */}
      {footer}
    </div>
  );
}
