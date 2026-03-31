import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConversationList } from "./conversation-list";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const getMock = vi.fn((): string | null => null);

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: pushMock,
    refresh: refreshMock,
  })),
  useSearchParams: vi.fn(() => ({
    get: getMock,
  })),
}));

vi.mock("@/actions/chat", () => ({
  createConversation: vi.fn(),
  deleteConversation: vi.fn(),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open, onOpenChange }: any) =>
    open ? (
      <div data-testid="dialog">
        {children}
        <button
          data-testid="dialog-onOpenChange-true"
          onClick={() => onOpenChange?.(true)}
        />
        <button
          data-testid="dialog-onOpenChange-false"
          onClick={() => onOpenChange?.(false)}
        />
      </div>
    ) : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { createConversation, deleteConversation } from "@/actions/chat";
import { toast } from "sonner";

const mockConversations = [
  { id: 1, title: "First Chat", updatedAt: new Date("2025-01-10T10:00:00") },
  { id: 2, title: "Second Chat", updatedAt: new Date("2025-01-11T12:00:00") },
  { id: 3, title: "", updatedAt: new Date("2025-01-12T14:00:00") },
];

describe("ConversationList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockReturnValue(null);
  });

  it("renders a New Chat button", () => {
    render(<ConversationList conversations={[]} />);
    expect(screen.getByText("New Chat")).toBeInTheDocument();
  });

  it("shows empty state when no conversations", () => {
    render(<ConversationList conversations={[]} />);
    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
  });

  it("renders conversation titles", () => {
    render(<ConversationList conversations={mockConversations} />);
    expect(screen.getByText("First Chat")).toBeInTheDocument();
    expect(screen.getByText("Second Chat")).toBeInTheDocument();
  });

  it("renders 'New Conversation' for conversations without a title", () => {
    render(<ConversationList conversations={mockConversations} />);
    // The third conversation has empty title, so it should show "New Conversation"
    expect(screen.getByText("New Conversation")).toBeInTheDocument();
  });

  it("renders relative timestamps", () => {
    render(<ConversationList conversations={mockConversations} />);
    // formatDistanceToNow will produce strings like "x months ago" etc.
    // Just verify the time spans are rendered
    const timeSpans = screen.getAllByText(/ago/);
    expect(timeSpans.length).toBe(3);
  });

  it("navigates to conversation on click", () => {
    render(<ConversationList conversations={mockConversations} />);
    fireEvent.click(screen.getByText("First Chat"));
    expect(pushMock).toHaveBeenCalledWith("/chat?id=1");
  });

  it("highlights active conversation", () => {
    getMock.mockReturnValue("2");
    const { container } = render(
      <ConversationList conversations={mockConversations} />
    );
    // The active one should have border-green-500
    const activeItem = container.querySelector(".border-green-500");
    expect(activeItem).toBeInTheDocument();
  });

  describe("new chat", () => {
    it("creates a new conversation and navigates to it", async () => {
      vi.mocked(createConversation).mockResolvedValue(42);
      render(<ConversationList conversations={[]} />);

      fireEvent.click(screen.getByText("New Chat"));

      await waitFor(() => {
        expect(createConversation).toHaveBeenCalled();
        expect(pushMock).toHaveBeenCalledWith("/chat?id=42");
      });
    });

    it("shows error toast when createConversation fails", async () => {
      vi.mocked(createConversation).mockRejectedValue(new Error("fail"));
      render(<ConversationList conversations={[]} />);

      fireEvent.click(screen.getByText("New Chat"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to start new chat");
      });
    });
  });

  describe("delete conversation", () => {
    it("opens delete dialog when trash icon is clicked", () => {
      render(<ConversationList conversations={mockConversations} />);
      // Each conversation has a delete button; they are ghost buttons with Trash2 icon
      const deleteButtons = screen
        .getAllByRole("button")
        .filter(
          (btn) => btn !== screen.getByText("New Chat").closest("button")
        );

      // Click the first delete button (for "First Chat")
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText("Delete conversation?")).toBeInTheDocument();
      expect(
        screen.getByText(/This will permanently delete "First Chat"/)
      ).toBeInTheDocument();
    });

    it("shows 'New Conversation' in dialog for untitled conversations", () => {
      render(<ConversationList conversations={mockConversations} />);
      const deleteButtons = screen
        .getAllByRole("button")
        .filter(
          (btn) => btn !== screen.getByText("New Chat").closest("button")
        );

      // Click delete for the 3rd conversation (empty title)
      fireEvent.click(deleteButtons[2]);

      expect(
        screen.getByText(/This will permanently delete "New Conversation"/)
      ).toBeInTheDocument();
    });

    it("confirms deletion and shows success toast", async () => {
      vi.mocked(deleteConversation).mockResolvedValue(undefined as any);
      render(<ConversationList conversations={mockConversations} />);

      const deleteButtons = screen
        .getAllByRole("button")
        .filter(
          (btn) => btn !== screen.getByText("New Chat").closest("button")
        );
      fireEvent.click(deleteButtons[0]);

      // Click "Delete" in the dialog
      const confirmButton = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(deleteConversation).toHaveBeenCalledWith(1);
        expect(toast.success).toHaveBeenCalledWith("Conversation deleted");
      });
    });

    it("navigates to /chat when deleting the active conversation", async () => {
      getMock.mockReturnValue("1");
      vi.mocked(deleteConversation).mockResolvedValue(undefined as any);
      render(<ConversationList conversations={mockConversations} />);

      const deleteButtons = screen
        .getAllByRole("button")
        .filter(
          (btn) => btn !== screen.getByText("New Chat").closest("button")
        );
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith("/chat");
      });
    });

    it("calls router.refresh when deleting a non-active conversation", async () => {
      getMock.mockReturnValue("999");
      vi.mocked(deleteConversation).mockResolvedValue(undefined as any);
      render(<ConversationList conversations={mockConversations} />);

      const deleteButtons = screen
        .getAllByRole("button")
        .filter(
          (btn) => btn !== screen.getByText("New Chat").closest("button")
        );
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      await waitFor(() => {
        expect(refreshMock).toHaveBeenCalled();
      });
    });

    it("shows error toast when delete fails", async () => {
      vi.mocked(deleteConversation).mockRejectedValue(new Error("fail"));
      render(<ConversationList conversations={mockConversations} />);

      const deleteButtons = screen
        .getAllByRole("button")
        .filter(
          (btn) => btn !== screen.getByText("New Chat").closest("button")
        );
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Could not delete");
      });
    });

    it("closes dialog when Cancel is clicked", () => {
      render(<ConversationList conversations={mockConversations} />);
      const deleteButtons = screen
        .getAllByRole("button")
        .filter(
          (btn) => btn !== screen.getByText("New Chat").closest("button")
        );
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText("Delete conversation?")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      // Dialog should close
      expect(
        screen.queryByText("Delete conversation?")
      ).not.toBeInTheDocument();
    });

    it("does not close dialog when onOpenChange is called with true", () => {
      render(<ConversationList conversations={mockConversations} />);
      const deleteButtons = screen
        .getAllByRole("button")
        .filter(
          (btn) => btn !== screen.getByText("New Chat").closest("button")
        );
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText("Delete conversation?")).toBeInTheDocument();

      // Trigger onOpenChange(true) — the `if (!open)` false branch
      fireEvent.click(screen.getByTestId("dialog-onOpenChange-true"));

      // Dialog should still be open
      expect(screen.getByText("Delete conversation?")).toBeInTheDocument();
    });

    it("closes dialog when onOpenChange is called with false", () => {
      render(<ConversationList conversations={mockConversations} />);
      const deleteButtons = screen
        .getAllByRole("button")
        .filter(
          (btn) => btn !== screen.getByText("New Chat").closest("button")
        );
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText("Delete conversation?")).toBeInTheDocument();

      // Trigger onOpenChange(false) — the `if (!open)` true branch
      fireEvent.click(screen.getByTestId("dialog-onOpenChange-false"));

      // Dialog should close (setDeletingConv(null) was called)
      expect(
        screen.queryByText("Delete conversation?")
      ).not.toBeInTheDocument();
    });
  });
});
