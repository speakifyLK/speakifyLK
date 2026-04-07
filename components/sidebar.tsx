import { ClerkLoading, ClerkLoaded, UserButton } from "@clerk/nextjs";
import { Loader, MessageCircle, Shield } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { SidebarItem } from "./sidebar-item";

type SidebarProps = {
  className?: string;
  isAdmin?: boolean;
};

export const Sidebar = ({ className, isAdmin }: SidebarProps) => {
  return (
    <div
      className={cn(
        "left-0 top-0 flex h-full flex-col border-r-2 px-4 lg:fixed lg:w-[256px]",
        className
      )}
    >
      <Link href="/learn">
        <div className="flex items-center gap-x-3 pb-7 pl-4 pt-8">
          <Image src="/mascot.svg" alt="Mascot" height={40} width={40} />

          <h1 className="text-2xl font-extrabold tracking-wide text-green-600">
            Speakify
          </h1>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-y-2">
        <SidebarItem label="Learn" href="/learn" iconSrc="/learn.svg" />
        <SidebarItem label="Quiz" href="/quiz" iconSrc="/quiz.svg" />
        <SidebarItem
          label="Chat"
          href="/chat"
          icon={<MessageCircle className="h-8 w-8 text-slate-500" />}
        />
        <SidebarItem
          label="Leaderboard"
          href="/leaderboard"
          iconSrc="/leaderboard.svg"
        />
        <SidebarItem label="Quests" href="/quests" iconSrc="/quests.svg" />
        <SidebarItem label="Shop" href="/shop" iconSrc="/shop.svg" />
      </div>

      <div className="flex items-center gap-x-3 p-4">
        <ClerkLoading>
          <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
        </ClerkLoading>

        <ClerkLoaded>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: { userButtonPopoverCard: { pointerEvents: "initial" } },
            }}
          />
        </ClerkLoaded>

        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-x-2 rounded-lg border-2 border-b-4 border-slate-200 px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100 active:border-b-2"
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        )}
      </div>
    </div>
  );
};
