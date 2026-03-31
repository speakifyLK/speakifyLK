import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist mocks ──────────────────────────────────────────────────────
const mockAuth = vi.hoisted(() => vi.fn());
const mockCurrentUser = vi.hoisted(() => vi.fn());
const mockGetUserSubscription = vi.hoisted(() => vi.fn());
const mockGetStripe = vi.hoisted(() => vi.fn());
const mockAbsoluteUrl = vi.hoisted(() =>
  vi.fn().mockReturnValue("http://localhost:3000/shop")
);

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser,
}));

vi.mock("@/db/queries", () => ({
  getUserSubscription: mockGetUserSubscription,
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: mockGetStripe,
}));

vi.mock("@/lib/utils", () => ({
  absoluteUrl: mockAbsoluteUrl,
}));

import { createStripeUrl } from "./user-subscription";

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: "user-1" });
  mockCurrentUser.mockResolvedValue({
    emailAddresses: [{ emailAddress: "test@example.com" }],
  });
  mockAbsoluteUrl.mockReturnValue("http://localhost:3000/shop");
});

describe("createStripeUrl", () => {
  it("throws when not authenticated (no userId)", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    await expect(createStripeUrl()).rejects.toThrow("Unauthorized.");
  });

  it("throws when currentUser is null", async () => {
    mockCurrentUser.mockResolvedValue(null);
    await expect(createStripeUrl()).rejects.toThrow("Unauthorized.");
  });

  it("returns billing portal URL for existing subscription", async () => {
    mockGetUserSubscription.mockResolvedValue({
      stripeCustomerId: "cus_123",
    });
    const mockCreate = vi
      .fn()
      .mockResolvedValue({ url: "https://billing.stripe.com/portal" });
    mockGetStripe.mockReturnValue({
      billingPortal: {
        sessions: { create: mockCreate },
      },
    });

    const result = await createStripeUrl();

    expect(result).toEqual({ data: "https://billing.stripe.com/portal" });
    expect(mockCreate).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "http://localhost:3000/shop",
    });
  });

  it("returns checkout URL for new subscription", async () => {
    mockGetUserSubscription.mockResolvedValue(null);
    const mockCreate = vi
      .fn()
      .mockResolvedValue({ url: "https://checkout.stripe.com/session" });
    mockGetStripe.mockReturnValue({
      checkout: {
        sessions: { create: mockCreate },
      },
    });

    const result = await createStripeUrl();

    expect(result).toEqual({ data: "https://checkout.stripe.com/session" });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: "test@example.com",
        metadata: { userId: "user-1" },
        success_url: "http://localhost:3000/shop",
        cancel_url: "http://localhost:3000/shop",
      })
    );
  });

  it("returns checkout URL when subscription exists but has no stripeCustomerId", async () => {
    mockGetUserSubscription.mockResolvedValue({ stripeCustomerId: null });
    const mockCreate = vi
      .fn()
      .mockResolvedValue({ url: "https://checkout.stripe.com/new" });
    mockGetStripe.mockReturnValue({
      checkout: {
        sessions: { create: mockCreate },
      },
    });

    const result = await createStripeUrl();
    expect(result).toEqual({ data: "https://checkout.stripe.com/new" });
  });
});
