// "use client";

// import { useEffect, useRef } from "react";
// import { ScrollArea } from "@/components/ui/scroll-area";

// export function ChatWindow({ children }: { children: React.ReactNode }) {
//   const scrollRef = useRef<HTMLDivElement>(null);

//   // Auto-scroll to bottom when new messages (children) are added
//   useEffect(() => {
//     if (scrollRef.current) {
//       const scrollContainer = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
//       if (scrollContainer) {
//         scrollContainer.scrollTo({
//           top: scrollContainer.scrollHeight,
//           behavior: "smooth",
//         });
//       }
//     }
//   }, [children]);

//   return (
//     <ScrollArea
//       ref={scrollRef}
//       className="min-h-[400px] flex-1 rounded-lg border bg-slate-50/50 p-4 pr-4"
//     >
//       <div className="flex flex-col gap-y-2">{children}</div>
//     </ScrollArea>
//   );
// }

"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MessageSquareQuote } from "lucide-react";

interface ChatWindowProps {
  children: React.ReactNode;
  isEmpty: boolean;
  isTyping: boolean;
}

export function ChatWindow({ children, isEmpty, isTyping }: ChatWindowProps) {
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
    <div className="flex flex-col h-full border rounded-xl bg-white shadow-sm overflow-hidden">
      {/* 1. Essential Header */}
      <div className="p-3 border-b flex items-center gap-x-3 bg-slate-50/50">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="font-semibold text-sm">Sinhala Tutor Session</h2>
      </div>

      <ScrollArea
        ref={scrollRef}
        className="min-h-[400px] flex-1 bg-slate-50/30 p-4"
      >
        {/* 2. Essential Empty State */}
        {isEmpty && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 py-20">
            <MessageSquareQuote className="h-10 w-10 opacity-20" />
            <p className="text-sm">Start a conversation in Sinhala!</p>
          </div>
        )}

        <div className="flex flex-col gap-y-2">
          {children}
          
          {/* 3. Essential Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-x-2 p-2 text-muted-foreground">
              <div className="flex gap-x-1">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
              </div>
              <span className="text-xs italic">Tutor is typing...</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}