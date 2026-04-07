"use client";

import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs";
import { Loader } from "lucide-react";
import { Layout, type LayoutProps, Menu } from "react-admin";

const AdminMenu = () => (
  <div className="flex h-full flex-col">
    <Menu className="flex-1" />
    <div className="p-4">
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
    </div>
  </div>
);

export const AdminLayout = (props: LayoutProps) => (
  <Layout {...props} menu={AdminMenu} />
);
