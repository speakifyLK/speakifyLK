"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-y-6 p-4">
      <div className="flex flex-col items-center gap-y-2 text-center">
        <AlertTriangle className="h-12 w-12 text-rose-500" />
        <h2 className="text-2xl font-bold">Something went wrong!</h2>
        <p className="max-w-md text-muted-foreground">
          We encountered an error while loading your tutor session. This might be due to a
          connection issue.
        </p>
      </div>

      <div className="flex items-center gap-x-4">
        <Button onClick={() => reset()} variant="primary">
          Try again
        </Button>
        <Button asChild variant="ghost">
          <Link href="/learn">Back to Learn</Link>
        </Button>
      </div>
    </div>
  );
}
