"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export const ChatButton = () => {
  const router = useRouter();

  const handleClick = () => {
    router.push("/chat");
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={handleClick}
        size="icon"
        className="h-14 w-14 rounded-full shadow-2xl bg-green-600 hover:bg-green-700 transition-all hover:scale-110 active:scale-95"
      >
        <MessageCircle className="h-7 w-7 text-white" />
      </Button>
    </div>
  );
};