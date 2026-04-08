import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FeedWrapper } from "@/components/feed-wrapper";
import { StickyWrapper } from "@/components/sticky-wrapper";
import { UserProgress } from "@/components/user-progress";
import { Promo } from "@/components/promo";
import {
  getUserProgress,
  getUserSubscription,
  getConversations,
  getConversationById,
  getStreakData,
} from "@/db/queries";

import { getOrCreateConversation } from "@/actions/chat";

import { ChatClient } from "./chat-client";
import { ConversationList } from "@/components/chat/conversation-list";

interface ChatPageProps {
  searchParams: Promise<{ id?: string }>;
}

const ChatPage = async ({ searchParams }: ChatPageProps) => {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }
  const params = await searchParams;

  // 1. Determine which conversation to show
  // If there's an ID in the URL, use it. Otherwise, get/create the latest one.
  let activeId: number;
  if (params.id) {
    activeId = Number.parseInt(params.id, 10);
    if (Number.isNaN(activeId) || activeId <= 0) {
      redirect("/chat");
    }
  } else {
    activeId = await getOrCreateConversation();
  }

  // 2. Fetch all data in parallel for speed
  const [conversations, activeConversation, userProgress, userSubscription, streakData] =
    await Promise.all([
      getConversations(),
      getConversationById(activeId),
      getUserProgress(),
      getUserSubscription(),
      getStreakData(),
    ]);

  const isPro = !!userSubscription?.isActive;

  if (!userProgress || !userProgress.activeCourse) {
    redirect("/courses");
  }

  // Handle case where an invalid ID was passed in the URL
  if (!activeConversation) {
    redirect("/chat");
  }

  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
      <StickyWrapper>
        <UserProgress
          activeCourse={userProgress.activeCourse}
          hearts={userProgress.hearts}
          points={userProgress.points}
          hasActiveSubscription={isPro}
          streak={streakData.currentStreak}
        />
        {!isPro && <Promo />}
        <ConversationList
          conversations={conversations.map((c) => ({
            id: c.id,
            title: c.title || "New Conversation",
            updatedAt: c.updatedAt,
          }))}
        />
      </StickyWrapper>
      <FeedWrapper>
        <div className="sticky top-0 mb-5 flex items-center justify-between border-b-2 bg-white pb-3 text-neutral-400 lg:z-50 lg:mt-[-28px] lg:pt-[28px]">
          <Button asChild size="sm" variant="ghost">
            <Link href="/learn">
              <ArrowLeft className="h-5 w-5 stroke-2 text-neutral-400" />
            </Link>
          </Button>
          <h1 className="text-lg font-bold">Chat</h1>
          <div aria-hidden />
        </div>
        <div className="h-[calc(100vh-180px)] lg:h-[calc(100vh-140px)]">
          <ChatClient
            initialMessages={activeConversation.messages.map(
              (msg: { role: "user" | "assistant"; content: string; timestamp: Date }) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              })
            )}
            conversationId={activeId}
            userProgress={userProgress}
          />
        </div>
      </FeedWrapper>
    </div>
  );
};

export default ChatPage;
