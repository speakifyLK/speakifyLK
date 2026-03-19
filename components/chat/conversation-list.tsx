"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createConversation, deleteConversation } from "@/actions/chat";
import { toast } from "sonner";

interface Conversation {
  id: number;
  title: string;
  updatedAt: Date;
}

export const ConversationList = ({ conversations }: { conversations: Conversation[] }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("id");

  const [deletingConv, setDeletingConv] = useState<Conversation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const onNewChat = async () => {
    try {
      const id = await createConversation();
      router.push(`/chat?id=${id}`);
    } catch {
      toast.error("Failed to start new chat");
    }
  };

  const onDeleteClick = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingConv(conv);
  };

  const onConfirmDelete = async () => {
    if (!deletingConv) return;

    setIsDeleting(true);
    try {
      await deleteConversation(deletingConv.id);
      toast.success("Conversation deleted");
      setDeletingConv(null);

      if (activeId === deletingConv.id.toString()) {
        router.push("/chat");
      } else {
        router.refresh();
      }
    } catch {
      toast.error("Could not delete");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex h-full flex-col gap-y-4 border-r p-4">
        <Button onClick={onNewChat} className="w-full gap-x-2" variant="sidebar">
          <Plus className="h-4 w-4" /> New Chat
        </Button>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="mt-10 text-center text-sm text-muted-foreground">No conversations yet</p>
          )}

          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => router.push(`/chat?id=${conv.id}`)}
              className={cn(
                "group relative flex cursor-pointer flex-col rounded-lg p-3 transition hover:bg-slate-100",
                activeId === conv.id.toString() && "border-l-4 border-green-500 bg-slate-100"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="truncate pr-6 text-sm font-medium">
                  {conv.title || "New Conversation"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-rose-500 opacity-0 group-hover:opacity-100"
                  onClick={(e) => onDeleteClick(conv, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingConv}
        onOpenChange={(open) => {
          if (!open) setDeletingConv(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{deletingConv?.title || "New Conversation"}&quot;
              and all its messages. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              //variant="outline"
              onClick={() => setDeletingConv(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              //variant="destructive"
              onClick={onConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
