import { Loader } from "lucide-react";

export default function Loading() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-50/50">
      <div className="flex flex-col items-center gap-y-4">
        <Loader className="h-10 w-10 text-zinc-400 animate-spin" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Connecting to AI Sinhala Tutor...
        </p>
      </div>
    </div>
  );
}