import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockClose = vi.fn();
const mockPush = vi.fn();

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

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
}));

vi.mock("@/store/use-hearts-modal", () => ({
  useHeartsModal: vi.fn(() => ({ isOpen: true, close: mockClose })),
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

import { HeartsModal } from "./hearts-modal";

describe("HeartsModal", () => {
  beforeEach(() => {
    mockClose.mockClear();
    mockPush.mockClear();
  });

  it("renders when open", () => {
    render(<HeartsModal />);

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
  });

  it("renders title text", () => {
    render(<HeartsModal />);

    expect(screen.getByText("You ran out of hearts!")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<HeartsModal />);

    expect(
      screen.getByText(
        "Get Pro for unlimited hearts, or purchase them in the store."
      )
    ).toBeInTheDocument();
  });

  it("renders mascot bad image", () => {
    render(<HeartsModal />);

    const img = screen.getByAltText("Mascot Bad");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/mascot_bad.svg");
  });

  it("renders 'Get unlimited hearts' button", () => {
    render(<HeartsModal />);

    expect(screen.getByText("Get unlimited hearts")).toBeInTheDocument();
  });

  it("renders 'No thanks' button", () => {
    render(<HeartsModal />);

    expect(screen.getByText("No thanks")).toBeInTheDocument();
  });

  it("calls close and router.push('/store') when 'Get unlimited hearts' is clicked", () => {
    render(<HeartsModal />);

    fireEvent.click(screen.getByText("Get unlimited hearts"));
    expect(mockClose).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/store");
  });

  it("calls close when 'No thanks' is clicked", () => {
    render(<HeartsModal />);

    fireEvent.click(screen.getByText("No thanks"));
    expect(mockClose).toHaveBeenCalled();
  });

  it("returns null when not on client (SSR)", () => {
    mockUseSyncExternalStore.override = false;
    const { container } = render(<HeartsModal />);
    expect(container.innerHTML).toBe("");
    mockUseSyncExternalStore.override = null;
  });
});
