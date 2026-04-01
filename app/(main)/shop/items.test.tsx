import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockRefillHearts = vi.hoisted(() => vi.fn());
const mockCreateStripeUrl = vi.hoisted(() => vi.fn());

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), loading: vi.fn() },
}));

vi.mock("@/actions/user-progress", () => ({
  refillHearts: mockRefillHearts,
}));

vi.mock("@/actions/user-subscription", () => ({
  createStripeUrl: mockCreateStripeUrl,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

import { Items } from "./items";

describe("Items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefillHearts.mockResolvedValue(undefined);
    mockCreateStripeUrl.mockResolvedValue({ data: null });
  });

  it("renders refill hearts section", () => {
    render(<Items hearts={3} points={100} hasActiveSubscription={false} />);
    expect(screen.getByText("Refill hearts")).toBeInTheDocument();
    expect(screen.getByAltText("Heart")).toBeInTheDocument();
  });

  it("renders unlimited hearts section", () => {
    render(<Items hearts={3} points={100} hasActiveSubscription={false} />);
    expect(screen.getByText("Unlimited hearts")).toBeInTheDocument();
    expect(screen.getByAltText("Unlimited")).toBeInTheDocument();
  });

  it("shows 'full' when hearts are at max", () => {
    render(<Items hearts={5} points={100} hasActiveSubscription={false} />);
    expect(screen.getByText("full")).toBeInTheDocument();
  });

  it("shows points cost when hearts are not full", () => {
    render(<Items hearts={3} points={100} hasActiveSubscription={false} />);
    expect(screen.getByText("10")).toBeInTheDocument(); // POINTS_TO_REFILL
    expect(screen.getByAltText("Points")).toBeInTheDocument();
  });

  it("shows 'upgrade' button when not subscribed", () => {
    render(<Items hearts={3} points={100} hasActiveSubscription={false} />);
    expect(screen.getByText("upgrade")).toBeInTheDocument();
  });

  it("shows 'settings' button when subscribed", () => {
    render(<Items hearts={3} points={100} hasActiveSubscription={true} />);
    expect(screen.getByText("settings")).toBeInTheDocument();
  });

  it("calls refillHearts when refill button is clicked", () => {
    render(<Items hearts={3} points={100} hasActiveSubscription={false} />);
    // The refill button contains the points cost
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // First button is refill
    expect(mockRefillHearts).toHaveBeenCalled();
  });

  it("does not call refillHearts when hearts are full", () => {
    render(<Items hearts={5} points={100} hasActiveSubscription={false} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(mockRefillHearts).not.toHaveBeenCalled();
  });

  it("does not call refillHearts when not enough points", () => {
    render(<Items hearts={3} points={5} hasActiveSubscription={false} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(mockRefillHearts).not.toHaveBeenCalled();
  });

  it("calls createStripeUrl when upgrade button is clicked", () => {
    render(<Items hearts={3} points={100} hasActiveSubscription={false} />);
    const upgradeButton = screen.getByText("upgrade");
    fireEvent.click(upgradeButton);
    expect(mockCreateStripeUrl).toHaveBeenCalled();
  });

  it("disables refill button when hearts are full", () => {
    render(<Items hearts={5} points={100} hasActiveSubscription={false} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toBeDisabled();
  });

  it("disables refill button when points are insufficient", () => {
    render(<Items hearts={3} points={5} hasActiveSubscription={false} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toBeDisabled();
  });

  it("redirects to stripe checkout when createStripeUrl returns data", async () => {
    const originalLocation = window.location;
    // @ts-expect-error - mocking window.location
    delete window.location;
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, href: "" },
      writable: true,
      configurable: true,
    });

    mockCreateStripeUrl.mockResolvedValue({
      data: "https://checkout.stripe.com/test",
    });
    render(<Items hearts={3} points={100} hasActiveSubscription={false} />);
    fireEvent.click(screen.getByText("upgrade"));

    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.stripe.com/test");
    });

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it("shows error toast when createStripeUrl fails", async () => {
    const { toast } = await import("sonner");
    mockCreateStripeUrl.mockRejectedValue(new Error("fail"));
    render(<Items hearts={3} points={100} hasActiveSubscription={false} />);
    fireEvent.click(screen.getByText("upgrade"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong.");
    });
  });

  it("shows error toast when refillHearts fails", async () => {
    const { toast } = await import("sonner");
    mockRefillHearts.mockRejectedValue(new Error("fail"));
    render(<Items hearts={3} points={100} hasActiveSubscription={false} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong.");
    });
  });
});
