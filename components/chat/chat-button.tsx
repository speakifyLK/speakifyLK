"use client";

import { MessageCircle } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export const ChatButton = () => {
  const router = useRouter();
  const pathname = usePathname();

  // Hide the floating chat button when already on the chat page
  if (pathname === "/chat") return null;

  const handleClick = () => {
    router.push("/chat");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={handleClick}
        size="icon"
        className="h-14 w-14 rounded-full bg-green-600 shadow-2xl transition-all hover:scale-110 hover:bg-green-700 active:scale-95"
      >
        <MessageCircle className="h-7 w-7 text-white" />
      </Button>
    </div>
  );
};
