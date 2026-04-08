import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const pushMock = vi.fn();
const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: pushMock,
    refresh: vi.fn(),
  })),
  usePathname: () => mockUsePathname(),
}));

import { ChatButton } from "./chat-button";

describe("ChatButton", () => {
  beforeEach(() => {
    pushMock.mockClear();
    mockUsePathname.mockReturnValue("/learn");
  });

  it("renders a button", () => {
    render(<ChatButton />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("navigates to /chat on click", () => {
    render(<ChatButton />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(pushMock).toHaveBeenCalledWith("/chat");
  });

  it("calls push exactly once per click", () => {
    render(<ChatButton />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(pushMock).toHaveBeenCalledTimes(2);
  });

  it("does not render when on the /chat page", () => {
    mockUsePathname.mockReturnValue("/chat");
    const { container } = render(<ChatButton />);
    expect(container.firstElementChild).toBeNull();
  });

  it("renders when on a different page", () => {
    mockUsePathname.mockReturnValue("/quiz");
    render(<ChatButton />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  describe("chat bubble", () => {
    it("displays the chat bubble by default", () => {
      render(<ChatButton />);
      expect(screen.getByText("Hi there!")).toBeInTheDocument();
      expect(screen.getByText("Chat and Learn!")).toBeInTheDocument();
    });

    it("closes the chat bubble when close button is clicked", () => {
      render(<ChatButton />);
      const closeButton = screen.getByLabelText("Close chat bubble");
      fireEvent.click(closeButton);
      expect(screen.queryByText("Hi there!")).not.toBeInTheDocument();
      expect(screen.queryByText("Chat and Learn!")).not.toBeInTheDocument();
    });

    it("still allows navigation when bubble is visible", () => {
      render(<ChatButton />);
      // Click the button, not the bubble
      const buttons = screen.getAllByRole("button");
      const chatButton = buttons.find(
        (btn) => btn.textContent.includes("message") || btn.className.includes("bg-green-600")
      );
      fireEvent.click(chatButton!);
      expect(pushMock).toHaveBeenCalledWith("/chat");
    });
  });
});
