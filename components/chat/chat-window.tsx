"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatWindowProps {
  children: React.ReactNode;
}

export function ChatWindow({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages (children) are added
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [children]);

  return (
    <ScrollArea 
      ref={scrollRef} 
      className="flex-1 pr-4 border rounded-lg p-4 bg-slate-50/50 min-h-[400px]"
    >
      <div className="flex flex-col gap-y-2">
        {children}
      </div>
    </ScrollArea>
  );
}