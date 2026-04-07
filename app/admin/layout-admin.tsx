"use client";

import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs";
import { ArrowLeft, Loader } from "lucide-react";
import Link from "next/link";
import { Layout, type LayoutProps, Menu } from "react-admin";

const AdminMenu = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 3em)",
    }}
  >
    <div style={{ flex: 1, overflowY: "auto" }}>
      <Menu />
    </div>
    <div className="flex items-center gap-x-3 p-4">
      <ClerkLoading>
        <Loader
          className="h-5 w-5 animate-spin text-muted-foreground"
          data-testid="clerk-loader"
        />
      </ClerkLoading>
      <ClerkLoaded>
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: { userButtonPopoverCard: { pointerEvents: "initial" } },
          }}
        />
      </ClerkLoaded>
      <Link
        href="/learn"
        className="flex items-center gap-x-2 rounded-lg border-2 border-b-4 border-slate-200 px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100 active:border-b-2"
        data-testid="back-to-app"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to App
      </Link>
    </div>
  </div>
);

export const AdminLayout = (props: LayoutProps) => (
  <Layout {...props} menu={AdminMenu} />
);
