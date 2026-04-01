import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockClose = vi.fn();

const { mockUseSyncExternalStore } = vi.hoisted(() => ({
  mockUseSyncExternalStore: { override: null as boolean | null },
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useSyncExternalStore: (
      subscribe: any,
      getSnapshot: any,
      getServerSnapshot?: any
    ) => {
      if (mockUseSyncExternalStore.override !== null) {
        subscribe(() => {});
        getSnapshot();
        if (getServerSnapshot) getServerSnapshot();
        return mockUseSyncExternalStore.override;
      }
      subscribe(() => {});
      getSnapshot();
      if (getServerSnapshot) getServerSnapshot();
      return actual.useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
      );
    },
  };
});

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("@/store/use-practice-modal", () => ({
  usePracticeModal: vi.fn(() => ({ isOpen: true, close: mockClose })),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: any) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogFooter: ({ children }: any) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

import { PracticeModal } from "./practice-modal";

describe("PracticeModal", () => {
  beforeEach(() => {
    mockClose.mockClear();
  });

  it("renders when open", () => {
    render(<PracticeModal />);

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });

  it("renders title text", () => {
    render(<PracticeModal />);

    expect(screen.getByText("Practice lesson")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<PracticeModal />);

    expect(
      screen.getByText(
        "Use practice lessons to regain hearts and points. You cannot loose hearts or points in practice lessons."
      )
    ).toBeInTheDocument();
  });

  it("renders heart image", () => {
    render(<PracticeModal />);

    const img = screen.getByAltText("Heart");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/heart.svg");
  });

  it("renders 'I understand' button", () => {
    render(<PracticeModal />);

    expect(screen.getByText("I understand")).toBeInTheDocument();
  });

  it("calls close when 'I understand' is clicked", () => {
    render(<PracticeModal />);

    fireEvent.click(screen.getByText("I understand"));
    expect(mockClose).toHaveBeenCalled();
  });

  it("returns null when not on client (SSR)", () => {
    mockUseSyncExternalStore.override = false;
    const { container } = render(<PracticeModal />);
    expect(container.innerHTML).toBe("");
    mockUseSyncExternalStore.override = null;
  });
});
