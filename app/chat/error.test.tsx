import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, asChild, variant, ...rest }: any) => {
    if (asChild) {
      // For the "asChild" pattern, render children directly
      return <>{children}</>;
    }
    return (
      <button onClick={onClick} data-variant={variant} {...rest}>
        {children}
      </button>
    );
  },
}));

describe("Chat Error", () => {
  it("renders the error heading", async () => {
    const ErrorPage = (await import("./error")).default;
    const reset = vi.fn();
    render(<ErrorPage error={new Error("test") as any} reset={reset} />);
    expect(screen.getByText("Something went wrong!")).toBeInTheDocument();
  });

  it("renders the error description", async () => {
    const ErrorPage = (await import("./error")).default;
    const reset = vi.fn();
    render(<ErrorPage error={new Error("test") as any} reset={reset} />);
    expect(
      screen.getByText(
        /We encountered an error while loading your tutor session/
      )
    ).toBeInTheDocument();
  });

  it("renders the Try again button", async () => {
    const ErrorPage = (await import("./error")).default;
    const reset = vi.fn();
    render(<ErrorPage error={new Error("test") as any} reset={reset} />);
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("calls reset when Try again is clicked", async () => {
    const ErrorPage = (await import("./error")).default;
    const reset = vi.fn();
    render(<ErrorPage error={new Error("test") as any} reset={reset} />);
    fireEvent.click(screen.getByText("Try again"));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("renders a link back to learn page", async () => {
    const ErrorPage = (await import("./error")).default;
    const reset = vi.fn();
    render(<ErrorPage error={new Error("test") as any} reset={reset} />);
    const link = screen.getByText("Back to Learn");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/learn");
  });
});
