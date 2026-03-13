import { Loader } from "lucide-react";

const Loading = () => {
  return (
    <div className="flex flex-row-reverse gap-[48px] px-6">
      {/* Sticky Sidebar Skeleton */}
      <div className="sticky top-6 hidden h-[calc(100vh-48px)] w-[368px] flex-col gap-y-4 lg:flex">
        {/* UserProgress Skeleton */}
        <div className="flex w-full items-center justify-between rounded-xl border-2 p-4">
          <div className="h-6 w-16 animate-pulse rounded-md bg-neutral-200" />
          <div className="h-6 w-16 animate-pulse rounded-md bg-neutral-200" />
          <div className="h-6 w-16 animate-pulse rounded-md bg-neutral-200" />
        </div>
        
        {/* Quests / History Skeleton */}
        <div className="mt-4 rounded-xl border-2 border-slate-200 p-4">
          <div className="h-6 w-32 animate-pulse rounded-md bg-neutral-200" />
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex h-16 w-full animate-pulse rounded-lg border-2 bg-neutral-100" />
            ))}
          </div>
        </div>
      </div>
      
      {/* Main Content Skeleton */}
      <div className="flex w-full flex-col items-center">
        {/* Header Skeleton */}
        <div className="mb-5 flex w-full items-center justify-between border-b-2 pb-4 text-neutral-400 lg:z-50 lg:-mt-[28px] lg:pt-[28px]">
          <Loader className="h-6 w-6 animate-spin text-neutral-400" />
          <div className="h-8 w-24 animate-pulse rounded-md bg-neutral-200" />
          <div className="h-6 w-6 opacity-0" />
        </div>
        
        {/* Config content skeleton */}
        <div className="w-full space-y-8 p-6">
          <div className="space-y-4">
            <div className="h-8 w-40 animate-pulse rounded-md bg-neutral-200" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-28 w-full animate-pulse rounded-xl border-2 border-b-4 bg-neutral-100 p-4" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-8 w-48 animate-pulse rounded-md bg-neutral-200" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 w-full animate-pulse rounded-xl border-2 border-b-4 bg-neutral-100 p-6" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loading;
