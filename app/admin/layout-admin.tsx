"use client";

import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs";
import { ArrowLeft, Loader } from "lucide-react";
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
        >
          <UserButton.MenuItems>
            <UserButton.Link
              label="Back to App"
              href="/learn"
              labelIcon={<ArrowLeft className="h-4 w-4" />}
            />
          </UserButton.MenuItems>
        </UserButton>
      </ClerkLoaded>
    </div>
  </div>
);

export const AdminLayout = (props: LayoutProps) => (
  <Layout {...props} menu={AdminMenu} />
);
