import { Loader } from "@/components/loader";

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-50/50">
      <div className="flex flex-col items-center gap-y-4">
        <Loader />
        <p className="animate-pulse text-sm font-medium text-muted-foreground">
          Connecting to AI Sinhala Tutor...
        </p>
      </div>
    </div>
  );
}
