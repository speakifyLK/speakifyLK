import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Loader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn("speakify-loader", className)}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
};
