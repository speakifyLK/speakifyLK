import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatInput } from "./chat-input";

describe("ChatInput", () => {
  let onSend: (message: string) => void;

  beforeEach(() => {
    onSend = vi.fn();
  });

  it("renders a textarea with placeholder", () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    expect(
      screen.getByPlaceholderText("Type your message in Sinhala or English...")
    ).toBeInTheDocument();
  });

  it("renders a send button", () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("calls onSend with trimmed content when clicking the send button", () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByPlaceholderText("Type your message in Sinhala or English...");
    fireEvent.change(textarea, { target: { value: "Hello there" } });

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(onSend).toHaveBeenCalledWith("Hello there");
  });

  it("clears the textarea after sending", () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByPlaceholderText(
      "Type your message in Sinhala or English..."
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button"));
    expect(textarea.value).toBe("");
  });

  it("does not call onSend when message is empty", () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("does not call onSend when message is only whitespace", () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByPlaceholderText("Type your message in Sinhala or English...");
    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button"));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("submits on Enter key (without Shift)", () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByPlaceholderText("Type your message in Sinhala or English...");
    fireEvent.change(textarea, { target: { value: "Enter test" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onSend).toHaveBeenCalledWith("Enter test");
  });

  it("does not submit on Shift+Enter", () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByPlaceholderText("Type your message in Sinhala or English...");
    fireEvent.change(textarea, { target: { value: "Multiline" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables textarea when loading", () => {
    render(<ChatInput onSend={onSend} isLoading={true} />);
    const textarea = screen.getByPlaceholderText("Type your message in Sinhala or English...");
    expect(textarea).toBeDisabled();
  });

  it("disables send button when loading", () => {
    render(<ChatInput onSend={onSend} isLoading={true} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("does not call onSend when loading even if content exists", () => {
    const { rerender } = render(<ChatInput onSend={onSend} isLoading={false} />);
    const textarea = screen.getByPlaceholderText("Type your message in Sinhala or English...");
    fireEvent.change(textarea, { target: { value: "test" } });

    // Re-render with isLoading = true
    rerender(<ChatInput onSend={onSend} isLoading={true} />);
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("send button is disabled when textarea is empty", () => {
    render(<ChatInput onSend={onSend} isLoading={false} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });
});
