import { Loader } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-50/50">
      <div className="flex flex-col items-center gap-y-4">
        <Loader className="h-10 w-10 animate-spin text-zinc-400" />
        <p className="animate-pulse text-sm font-medium text-muted-foreground">
          Connecting to AI Sinhala Tutor...
        </p>
      </div>
    </div>
  );
}
