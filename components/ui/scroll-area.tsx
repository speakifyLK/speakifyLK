"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Lightweight scroll area (no Radix package). Exposes
 * `[data-radix-scroll-area-viewport]` so callers like chat-window can query the scrollable node.
 */
const ScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative flex max-h-full min-h-0 w-full flex-col overflow-hidden", className)}
      {...props}
    >
      <div
        data-radix-scroll-area-viewport=""
        tabIndex={-1}
        className="min-h-0 flex-1 overflow-auto focus-visible:outline-none [&>*]:min-w-full"
      >
        {children}
      </div>
    </div>
  )
);
ScrollArea.displayName = "ScrollArea";

// Kept for API compatibility; no-op visual scrollbar wrapper
const ScrollBar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("hidden", className)} {...props} />
);
ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };
