import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUseMedia = vi.hoisted(() => vi.fn(() => false));

vi.mock("react-use", () => ({
  useKey: (_key: string, _fn: () => void) => {
    // We store the handler but don't auto-invoke it;
    // tests can simulate Enter via fireEvent
  },
  useMedia: mockUseMedia,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, variant, size, asChild, ...rest }: any) => {
    if (asChild) return <>{children}</>;
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        data-variant={variant}
        data-size={size}
        {...rest}
      >
        {children}
      </button>
    );
  },
}));

import { Footer } from "./footer";

describe("Footer", () => {
  beforeAll(() => {
    // polyfill for jsdom
    if (!window.matchMedia) {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Check button in none status", () => {
    render(<Footer onCheck={vi.fn()} status="none" />);
    expect(screen.getByText("Check")).toBeInTheDocument();
  });

  it("renders Next button in correct status", () => {
    render(<Footer onCheck={vi.fn()} status="correct" />);
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("renders Retry button in wrong status", () => {
    render(<Footer onCheck={vi.fn()} status="wrong" />);
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("renders Continue button in completed status", () => {
    render(<Footer onCheck={vi.fn()} status="completed" />);
    expect(screen.getByText("Continue")).toBeInTheDocument();
  });

  it("shows Nicely done! message for correct status", () => {
    render(<Footer onCheck={vi.fn()} status="correct" />);
    expect(screen.getByText("Nicely done!")).toBeInTheDocument();
  });

  it("shows Try again. message for wrong status", () => {
    render(<Footer onCheck={vi.fn()} status="wrong" />);
    expect(screen.getByText("Try again.")).toBeInTheDocument();
  });

  it("shows Practice again button for completed status with lessonId", () => {
    render(<Footer onCheck={vi.fn()} status="completed" lessonId={42} />);
    expect(screen.getByText("Practice again")).toBeInTheDocument();
  });

  it("calls onCheck when Check button is clicked", () => {
    const onCheck = vi.fn();
    render(<Footer onCheck={onCheck} status="none" />);
    fireEvent.click(screen.getByText("Check"));
    expect(onCheck).toHaveBeenCalledTimes(1);
  });

  it("disables Check button when disabled=true", () => {
    render(<Footer onCheck={vi.fn()} status="none" disabled={true} />);
    const checkBtn = screen.getByText("Check");
    expect(checkBtn).toBeDisabled();
  });

  it("uses danger variant for wrong status", () => {
    render(<Footer onCheck={vi.fn()} status="wrong" />);
    const retryBtn = screen.getByText("Retry");
    expect(retryBtn).toHaveAttribute("data-variant", "danger");
  });

  it("uses secondary variant for non-wrong status", () => {
    render(<Footer onCheck={vi.fn()} status="none" />);
    const checkBtn = screen.getByText("Check");
    expect(checkBtn).toHaveAttribute("data-variant", "secondary");
  });

  it("applies green background for correct status", () => {
    const { container } = render(<Footer onCheck={vi.fn()} status="correct" />);
    const footer = container.querySelector("footer");
    expect(footer?.className).toContain("bg-green-100");
  });

  it("applies rose background for wrong status", () => {
    const { container } = render(<Footer onCheck={vi.fn()} status="wrong" />);
    const footer = container.querySelector("footer");
    expect(footer?.className).toContain("bg-rose-100");
  });

  it("Practice again redirects to lesson URL", () => {
    // mock window.location
    const originalHref = window.location.href;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, href: "" },
    });

    render(<Footer onCheck={vi.fn()} status="completed" lessonId={7} />);
    fireEvent.click(screen.getByText("Practice again"));
    expect(window.location.href).toBe("/lesson/7");

    // restore
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: originalHref },
    });
  });

  it("uses sm size buttons when on mobile", () => {
    mockUseMedia.mockReturnValue(true);
    render(<Footer onCheck={vi.fn()} status="completed" lessonId={5} />);
    // Both buttons should have size="sm" via the mock Button
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      expect(btn).toHaveAttribute("data-size", "sm");
    }
    mockUseMedia.mockReturnValue(false);
  });
});
