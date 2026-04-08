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
      expect(container.querySelector("img[src='/bot.svg']")).toBeNull();
    });

    it("applies green bubble styling", () => {
      render(<ChatBubble role="user" content="Test" timestamp={validDate} />);
      const bubble = screen.getByText("Test").closest(".bg-green-500");
      expect(bubble).toBeInTheDocument();
      expect(bubble?.className).toContain("text-white");
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
      const avatar = container.querySelector("span.border, [class*='border']");
      expect(avatar).toBeTruthy();
    });

    it("applies white bubble styling with green border", () => {
      render(<ChatBubble role="assistant" content="Test" timestamp={validDate} />);
      const bubble = screen.getByText("Test").closest(".bg-white");
      expect(bubble).toBeInTheDocument();
      expect(bubble?.className).toContain("border-emerald-100");
    });
  });

  describe("timestamps", () => {
    it("formats a valid Date object", () => {
      render(<ChatBubble role="user" content="msg" timestamp={new Date("2025-01-15T14:30:00")} />);
      expect(screen.getByText(/2:30/)).toBeInTheDocument();
    });

    it("formats a valid string timestamp", () => {
      render(<ChatBubble role="user" content="msg" timestamp="2025-06-20T09:15:00" />);
      expect(screen.getByText(/9:15/)).toBeInTheDocument();
    });

    it("renders empty string for an invalid date", () => {
      const { container } = render(<ChatBubble role="user" content="msg" timestamp="not-a-date" />);
      const spans = Array.from(container.querySelectorAll("span"));
      const timeSpan = spans.find((s) => s.className.includes("mt-1"));
      expect(timeSpan).toBeTruthy();
      expect(timeSpan!.textContent).toBe("");
    });

    it("renders empty string for an invalid Date object", () => {
      const { container } = render(
        <ChatBubble role="user" content="msg" timestamp={new Date("invalid")} />
      );
      const spans = Array.from(container.querySelectorAll("span"));
      const timeSpan = spans.find((s) => s.className.includes("mt-1"));
      expect(timeSpan).toBeTruthy();
      expect(timeSpan!.textContent).toBe("");
    });
  });

  describe("FormattedMessagePart formatting", () => {
    it("renders a correction block when content contains ✏️", () => {
      render(
        <ChatBubble
          role="assistant"
          content="✏️ Let's refine that: ayubowan → āyubōvan"
          timestamp={validDate}
        />
      );
      expect(screen.getByText("LET'S REFINE THAT")).toBeInTheDocument();
      expect(screen.getByText("ayubowan")).toBeInTheDocument();
      expect(screen.getByText("āyubōvan")).toBeInTheDocument();
    });

    it("renders a vocabulary block when content contains 📖 New word:", () => {
      render(
        <ChatBubble
          role="assistant"
          content="📖 New word: ආයුබෝවන් (āyubōvan) — hello"
          timestamp={validDate}
        />
      );
      expect(screen.getByText("LEARNING POINT")).toBeInTheDocument();
      expect(screen.getByText("ආයුබෝවන්")).toBeInTheDocument();
      expect(screen.getByText("hello")).toBeInTheDocument();
    });

    it("renders Sinhala spoken format: Script (translit) [meaning]", () => {
      render(
        <ChatBubble role="assistant" content="ආයුබෝවන් (āyubōvan) [hello]" timestamp={validDate} />
      );
      expect(screen.getByText("ආයුබෝවන්")).toBeInTheDocument();
      expect(screen.getByText(/āyubōvan/)).toBeInTheDocument();
      expect(screen.getByText(/hello/)).toBeInTheDocument();
    });

    it("falls back to plain text when ✏️ is present but pattern is incomplete", () => {
      render(
        <ChatBubble role="assistant" content="✏️ just a note" timestamp={validDate} />
      );
      // Should render as plain text since "Let's refine that:" is missing
      expect(screen.getByText(/just a note/)).toBeInTheDocument();
    });

    it("falls back to plain text when 📖 is present but pattern is incomplete", () => {
      render(
        <ChatBubble role="assistant" content="📖 interesting fact" timestamp={validDate} />
      );
      // Should render as plain text since full "New word: X (Y) — Z" is missing
      expect(screen.getByText(/interesting fact/)).toBeInTheDocument();
    });

    it("falls back to plain text for user messages", () => {
      render(<ChatBubble role="user" content="plain text" timestamp={validDate} />);
      const span = screen.getByText("plain text");
      expect(span.className).toContain("text-white");
    });

    it("falls back to plain text for assistant messages", () => {
      render(<ChatBubble role="assistant" content="plain text" timestamp={validDate} />);
      const span = screen.getByText("plain text");
      expect(span.className).toContain("text-zinc-800");
    });
  });
});
