"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ChatWindow({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages (children) are added
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
  }, [children]);

  return (
    <ScrollArea
      ref={scrollRef}
      className="min-h-[400px] flex-1 rounded-lg border bg-slate-50/50 p-4 pr-4"
    >
      <div className="flex flex-col gap-y-2">{children}</div>
    </ScrollArea>
  );
}
