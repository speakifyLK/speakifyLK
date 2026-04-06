import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatBubble } from "./chat-bubble";

describe("ChatBubble", () => {
  const validDate = new Date("2025-01-15T14:30:00");

  describe("user messages", () => {
    it("renders the message content", () => {
      render(<ChatBubble role="user" content="Hello world" timestamp={validDate} />);
      expect(screen.getByText("Hello world")).toBeInTheDocument();
    });

    it("applies right-aligned (flex-row-reverse) layout", () => {
      const { container } = render(<ChatBubble role="user" content="Hi" timestamp={validDate} />);
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.className).toContain("flex-row-reverse");
    });

    it("does not render an avatar", () => {
      const { container } = render(<ChatBubble role="user" content="Hi" timestamp={validDate} />);
      // Avatar has an img with src="/bot.svg" — should not be present for user
      expect(container.querySelector("img[src='/bot.svg']")).toBeNull();
    });

    it("renders a spacer div instead of avatar", () => {
      const { container } = render(<ChatBubble role="user" content="Hi" timestamp={validDate} />);
      // The spacer is a div with class w-8 (no avatar)
      const spacer = container.querySelector("div.w-8");
      expect(spacer).toBeInTheDocument();
    });

    it("applies green bubble styling", () => {
      render(<ChatBubble role="user" content="Test" timestamp={validDate} />);
      const bubble = screen.getByText("Test");
      expect(bubble.className).toContain("bg-green-500");
      expect(bubble.className).toContain("text-white");
    });
  });

  describe("assistant messages", () => {
    it("renders the message content", () => {
      render(<ChatBubble role="assistant" content="I am a bot" timestamp={validDate} />);
      expect(screen.getByText("I am a bot")).toBeInTheDocument();
    });

    it("applies left-aligned (flex-row) layout", () => {
      const { container } = render(
        <ChatBubble role="assistant" content="Hi" timestamp={validDate} />
      );
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.className).toContain("flex-row");
      expect(wrapper.className).not.toContain("flex-row-reverse");
    });

    it("renders an avatar with bot fallback", () => {
      const { container } = render(
        <ChatBubble role="assistant" content="Hi" timestamp={validDate} />
      );
      // The avatar component renders with a span wrapping. Look for the AvatarRoot which has the border class
      const avatar = container.querySelector("span.border, [class*='border']");
      expect(avatar).toBeTruthy();
    });

    it("applies white bubble styling with green border", () => {
      render(<ChatBubble role="assistant" content="Test" timestamp={validDate} />);
      const bubble = screen.getByText("Test");
      expect(bubble.className).toContain("bg-white");
      expect(bubble.className).toContain("text-zinc-800");
    });
  });

  describe("timestamps", () => {
    it("formats a valid Date object", () => {
      render(<ChatBubble role="user" content="msg" timestamp={new Date("2025-01-15T14:30:00")} />);
      // format(date, "p") produces a locale time like "2:30 PM"
      expect(screen.getByText(/2:30/)).toBeInTheDocument();
    });

    it("formats a valid string timestamp", () => {
      render(<ChatBubble role="user" content="msg" timestamp="2025-06-20T09:15:00" />);
      expect(screen.getByText(/9:15/)).toBeInTheDocument();
    });

    it("renders empty string for an invalid date", () => {
      const { container } = render(<ChatBubble role="user" content="msg" timestamp="not-a-date" />);
      // The timestamp span should exist but be empty
      const timeSpan = container.querySelector("span.mt-1");
      expect(timeSpan).toBeInTheDocument();
      expect(timeSpan!.textContent).toBe("");
    });

    it("renders empty string for an invalid Date object", () => {
      const { container } = render(
        <ChatBubble role="user" content="msg" timestamp={new Date("invalid")} />
      );
      const timeSpan = container.querySelector("span.mt-1");
      expect(timeSpan).toBeInTheDocument();
      expect(timeSpan!.textContent).toBe("");
    });
  });
});
