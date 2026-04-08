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
        <div className="absolute bottom-full right-0 mb-4 animate-fadeInBounce">
          <div className="relative">
            {/* Bubble shadow layer */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-green-400/20 to-green-500/20 blur-3xl"></div>
            
            {/* Main bubble */}
            <div className="relative flex items-center justify-between gap-3 rounded-3xl bg-green-50 px-5 py-3 shadow-lg ring-1 ring-green-100 min-w-max">
              <div className="flex-1 pr-2">
                <p className="text-sm font-medium text-gray-800">
                  Hi there! <span className="animate-bounce inline-block">👋</span>
                </p>
                <p className="text-xs text-gray-600 leading-relaxed mt-1">
                  Chat and Learn!
                </p>
              </div>
              
              {/* Close button */}
              <button
                onClick={handleBubbleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                aria-label="Close chat bubble"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Bubble tail pointing to button */}
            <div className="absolute bottom-0 right-1/2 transform translate-x-1/2 translate-y-full h-3 w-3 rotate-45 bg-green-50 ring-1 ring-green-100"></div>
          </div>
        </div>
      )}
      
      {/* Floating Chat Button */}
      <Button
        onClick={handleClick}
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full bg-green-600 shadow-2xl transition-all hover:scale-110 hover:bg-green-700 active:scale-95",
          "relative animate-pulse-subtle hover:animate-none"
        )}
      >
        <MessageCircle className="h-7 w-7 text-white" />
        {/* Pulsing ring effect */}
        <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping-slow opacity-30"></div>
      </Button>
    </div>
  );
};
