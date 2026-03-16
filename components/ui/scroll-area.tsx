"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Lightweight scroll area implementation that avoids the Radix dependency.
 * Provides a styled, overflow-auto container compatible with existing usage.
 */
const ScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative max-h-full w-full overflow-auto [&>*]:min-w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
ScrollArea.displayName = "ScrollArea";

// Kept for API compatibility; no-op visual scrollbar wrapper
const ScrollBar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("hidden", className)} {...props} />
  )
);
ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };

