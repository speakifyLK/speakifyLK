import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatButton } from "./chat-button";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: pushMock,
    refresh: vi.fn(),
  })),
}));

describe("ChatButton", () => {
  beforeEach(() => {
    pushMock.mockClear();
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
});
