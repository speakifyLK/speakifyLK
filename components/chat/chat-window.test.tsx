import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatWindow } from "./chat-window";

const { mockIncludeViewport, mockForwardRef } = vi.hoisted(() => ({
  mockIncludeViewport: { value: true },
  mockForwardRef: { value: true },
}));

vi.mock("@/components/ui/scroll-area", () => {
  const React = require("react");
  return {
    ScrollArea: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div {...props} ref={mockForwardRef.value ? ref : undefined}>
        {mockIncludeViewport.value ? (
          <div data-radix-scroll-area-viewport="">{children}</div>
        ) : (
          children
        )}
      </div>
    )),
  };
});

// jsdom doesn't implement scrollTo
beforeAll(() => {
  Element.prototype.scrollTo = vi.fn();
});

describe("ChatWindow", () => {
  it("shows empty state when isEmpty is true", () => {
    render(
      <ChatWindow isEmpty={true} isTyping={false}>
        <div />
      </ChatWindow>
    );
    expect(
      screen.getByText("Start a conversation in Sinhala!")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your AI tutor is ready to help you practice")
    ).toBeInTheDocument();
  });

  it("does not show empty state when isEmpty is false", () => {
    render(
      <ChatWindow isEmpty={false} isTyping={false}>
        <div />
      </ChatWindow>
    );
    expect(
      screen.queryByText("Start a conversation in Sinhala!")
    ).not.toBeInTheDocument();
  });

  it("shows typing indicator when isTyping is true", () => {
    render(
      <ChatWindow isEmpty={false} isTyping={true}>
        <div />
      </ChatWindow>
    );
    expect(screen.getByText("Tutor is typing...")).toBeInTheDocument();
  });

  it("does not show typing indicator when isTyping is false", () => {
    render(
      <ChatWindow isEmpty={false} isTyping={false}>
        <div />
      </ChatWindow>
    );
    expect(screen.queryByText("Tutor is typing...")).not.toBeInTheDocument();
  });

  it("renders children", () => {
    render(
      <ChatWindow isEmpty={false} isTyping={false}>
        <p>Message content</p>
      </ChatWindow>
    );
    expect(screen.getByText("Message content")).toBeInTheDocument();
  });

  it("shows both empty state and typing indicator together", () => {
    render(
      <ChatWindow isEmpty={true} isTyping={true}>
        <div />
      </ChatWindow>
    );
    expect(
      screen.getByText("Start a conversation in Sinhala!")
    ).toBeInTheDocument();
    expect(screen.getByText("Tutor is typing...")).toBeInTheDocument();
  });

  it("auto-scrolls when content changes", () => {
    const { container } = render(
      <ChatWindow isEmpty={false} isTyping={false}>
        <p>msg1</p>
      </ChatWindow>
    );

    // Verify the viewport element exists in the DOM
    const viewport = container.querySelector(
      "[data-radix-scroll-area-viewport]"
    );
    expect(viewport).not.toBeNull();

    // scrollTo should have been called via Element.prototype.scrollTo mock
    expect(Element.prototype.scrollTo).toHaveBeenCalled();
  });

  it("handles missing scroll container gracefully", () => {
    mockIncludeViewport.value = false;
    render(
      <ChatWindow isEmpty={false} isTyping={false}>
        <p>no viewport</p>
      </ChatWindow>
    );

    // Should not throw even without the viewport element
    expect(screen.getByText("no viewport")).toBeInTheDocument();
    mockIncludeViewport.value = true;
  });

  it("handles null scrollRef gracefully", () => {
    mockForwardRef.value = false;
    render(
      <ChatWindow isEmpty={false} isTyping={false}>
        <p>null ref</p>
      </ChatWindow>
    );

    expect(screen.getByText("null ref")).toBeInTheDocument();
    mockForwardRef.value = true;
  });

  it("renders typing indicator bounce dots", () => {
    const { container } = render(
      <ChatWindow isEmpty={false} isTyping={true}>
        <div />
      </ChatWindow>
    );
    const dots = container.querySelectorAll("span.animate-bounce");
    expect(dots.length).toBe(3);
  });

  it("renders footer content inside the card", () => {
    render(
      <ChatWindow
        isEmpty={false}
        isTyping={false}
        footer={<div data-testid="footer-slot">Input here</div>}
      >
        <div />
      </ChatWindow>
    );
    expect(screen.getByTestId("footer-slot")).toBeInTheDocument();
    expect(screen.getByText("Input here")).toBeInTheDocument();
  });

  it("renders without footer when not provided", () => {
    const { container } = render(
      <ChatWindow isEmpty={false} isTyping={false}>
        <p>No footer</p>
      </ChatWindow>
    );
    expect(screen.getByText("No footer")).toBeInTheDocument();
    expect(container.querySelector("[data-testid='footer-slot']")).toBeNull();
  });
});
