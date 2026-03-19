import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { getUserProgress, getConversations, getConversationById } from "@/db/queries";

import { getOrCreateConversation, getMessages } from "@/actions/chat";

import { ChatClient } from "./chat-client";
import { ConversationList } from "@/components/chat/conversation-list";

// const ChatPage = async () => {
//   const { userId } = await auth();

//   if (!userId) {
//     redirect("/sign-in");
//   }

//   const [conversationId, userProgress] = await Promise.all([
//     getOrCreateConversation(),
//     getUserProgress(),
//   ]);

//   if (!userProgress || !userProgress.activeCourse) {
//     redirect("/courses");
//   }

//   // Optional: Redirect if out of hearts
//   // if (userProgress.hearts === 0) {
//   //    redirect("/shop");
//   // }

//   // Fetch messages once we have the conversation ID
//   const initialMessages = await getMessages(conversationId);

//   return (
//     <ChatClient
//       initialMessages={initialMessages.map((msg) => ({
//         ...msg,
//         // Ensure timestamp is a Date object for the client
//         timestamp: new Date(msg.timestamp),
//       }))}
//       conversationId={conversationId}
//       userProgress={userProgress}
//     />
//   );
// };

// export default ChatPage;

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
  const activeId = params.id ? parseInt(params.id) : await getOrCreateConversation();

  console.log("=== DEBUG ===");
  console.log("searchParams.id:", params.id);
  console.log("activeId:", activeId);

  // 2. Fetch all data in parallel for speed
  const [conversations, activeConversation, userProgress] = await Promise.all([
    getConversations(),
    getConversationById(activeId),
    getUserProgress(),
  ]);

  console.log("activeConversation.id:", activeConversation?.id);
  console.log("message count:", activeConversation?.messages?.length);
  console.log("first message:", activeConversation?.messages?.[0]?.content?.substring(0, 50));
  console.log("=============");

  if (!userProgress || !userProgress.activeCourse) {
    redirect("/courses");
  }

  // Handle case where an invalid ID was passed in the URL
  if (!activeConversation) {
    redirect("/chat");
  }

  return (
    <div className="flex h-full">
      {/* Sidebar Panel - Hidden on mobile, width 80 on desktop */}
      <aside className="hidden w-80 flex-col border-r bg-slate-50 lg:flex">
        <ConversationList
          conversations={conversations.map((c) => ({
            id: c.id,
            title: c.title || "New Conversation",
            updatedAt: c.updatedAt,
          }))}
        />
      </aside>

      {/* Main Chat Area */}
      <main className="relative w-full flex-1">
        <ChatClient
          initialMessages={activeConversation.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))}
          conversationId={activeId}
          userProgress={userProgress}
        />
      </main>
    </div>
  );
};

export default ChatPage;
