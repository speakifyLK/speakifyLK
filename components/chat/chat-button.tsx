"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ChatButton = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [showBubble, setShowBubble] = useState(true);

  // Hide the floating chat button when already on the chat page
  if (pathname === "/chat") return null;

  const handleClick = () => {
    router.push("/chat");
  };

  const handleBubbleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBubble(false);
  };

  return (
    <div className="fixed bottom-8 right-8 z-[9999]">
      {/* Animated Chat Bubble - positioned absolutely so it doesn't affect button position */}
      {showBubble && (
        <div className="animate-fadeInBounce absolute bottom-full right-0 mb-4">
          <div className="relative">
            {/* Bubble shadow layer */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-green-400/20 to-green-500/20 blur-3xl"></div>

            {/* Main bubble */}
            <div className="relative flex min-w-max items-center justify-between gap-3 rounded-3xl bg-green-600 px-5 py-3 shadow-lg ring-1 ring-green-500">
              <div className="flex-1 pr-2">
                <p className="text-sm font-medium text-white">
                  Hi there! <span className="inline-block animate-bounce">👋</span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-green-100">Chat and Learn!</p>
              </div>

              {/* Close button */}
              <button
                onClick={handleBubbleClose}
                className="flex-shrink-0 text-green-200 transition-colors hover:text-white"
                aria-label="Close chat bubble"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Bubble tail pointing to button */}
            <div className="absolute bottom-0 right-1/2 h-3 w-3 translate-x-1/2 translate-y-full rotate-45 transform bg-green-600 ring-1 ring-green-500"></div>
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      <Button
        onClick={handleClick}
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full bg-green-600 shadow-2xl transition-all hover:scale-110 hover:bg-green-700 active:scale-95",
          "animate-pulse-subtle relative hover:animate-none"
        )}
      >
        <MessageCircle className="h-7 w-7 text-white" />
        {/* Pulsing ring effect */}
        <div className="animate-ping-slow absolute inset-0 rounded-full border-2 border-green-400 opacity-30"></div>
      </Button>
    </div>
  );
};
