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
});
