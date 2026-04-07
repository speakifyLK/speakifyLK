"use client";

import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs";
import { Loader, Shield } from "lucide-react";

type SidebarUserButtonProps = {
  isAdmin?: boolean;
};

export const SidebarUserButton = ({ isAdmin }: SidebarUserButtonProps) => {
  return (
    <>
      <ClerkLoading>
        <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
      </ClerkLoading>

      <ClerkLoaded>
        {isAdmin ? (
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                userButtonPopoverCard: { pointerEvents: "initial" },
              },
            }}
          >
            <UserButton.MenuItems>
              <UserButton.Link
                label="Admin"
                href="/admin"
                labelIcon={<Shield className="h-4 w-4" />}
              />
            </UserButton.MenuItems>
          </UserButton>
        ) : (
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                userButtonPopoverCard: { pointerEvents: "initial" },
              },
            }}
          />
        )}
      </ClerkLoaded>
    </>
  );
};
