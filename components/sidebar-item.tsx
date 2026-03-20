"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

type SidebarItemProps = {
  label: string;
  iconSrc?: string; // Made optional
  icon?: React.ReactNode; // for Lucide icons
  href: string;
};

export const SidebarItem = ({ label, iconSrc, icon, href }: SidebarItemProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Button
      variant={isActive ? "sidebarOutline" : "sidebar"}
      className="h-[52px] justify-start"
      asChild
    >
      <Link href={href}>
        {/* Render Image if iconSrc is provided, otherwise render the Lucide icon */}
        {iconSrc ? (
          <Image src={iconSrc} alt={label} className="mr-5" height={32} width={32} />
        ) : (
          <div className="mr-5">{icon}</div>
        )}
        {label}
      </Link>
    </Button>
  );
};
