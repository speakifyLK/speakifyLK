import type { PropsWithChildren } from "react";
import { MobileHeader } from "@/components/mobile-header";
import { Sidebar } from "@/components/sidebar";
import { ChatButton } from "@/components/chat/chat-button";
import { getIsAdmin } from "@/lib/admin";

const MainLayout = async ({ children }: PropsWithChildren) => {
  const isAdmin = await getIsAdmin();

  return (
    <>
      <MobileHeader />
      <Sidebar className="hidden lg:flex" isAdmin={isAdmin} />
      <main className="h-full pt-[50px] lg:pl-[256px] lg:pt-0">
        <div className="mx-auto h-full max-w-[1056px] pt-6">{children}</div>
      </main>
      <ChatButton />
    </>
  );
};

export default MainLayout;
