"use client";

import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs";
import { Loader, Shield, User } from "lucide-react";

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
              label="Profile"
              href="/profile"
              labelIcon={<User className="h-4 w-4" />}
            />
            {isAdmin && (
              <UserButton.Link
                label="Admin"
                href="/admin"
                labelIcon={<Shield className="h-4 w-4" />}
              />
            )}
          </UserButton.MenuItems>
        </UserButton>
      </ClerkLoaded>
    </>
  );
};
