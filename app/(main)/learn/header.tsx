import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type HeaderProps = {
  title: string;
};

export const Header = ({ title }: HeaderProps) => {
  return (
    <div className="sticky top-0 mb-5 flex items-center justify-between border-b-2 bg-white pb-3 text-neutral-400 dark:bg-background dark:text-neutral-500 lg:z-50 lg:mt-[-28px] lg:pt-[28px]">
      <Button asChild size="sm" variant="ghost">
        <Link href="/courses">
          <ArrowLeft className="h-5 w-5 stroke-2 text-neutral-400" />
        </Link>
      </Button>

      <h1 className="text-lg font-bold">{title}</h1>
      <div aria-hidden />
    </div>
  );
};
