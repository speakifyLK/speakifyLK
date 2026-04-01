import { describe, it, expect, vi, beforeEach } from "vitest";

// ── hoisted mocks ──────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => {
  const valuesFn = vi.fn();
  const whereFn = vi.fn();
  const setFn = vi.fn(() => ({ where: whereFn }));

  return {
    headers: vi.fn(),
    constructEvent: vi.fn(),
    subscriptionsRetrieve: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(() => ({ values: valuesFn })),
    values: valuesFn,
    update: vi.fn(() => ({ set: setFn })),
    set: setFn,
    where: whereFn,
  };
});

// ── module mocks ───────────────────────────────────────────────────────────
vi.mock("next/headers", () => ({
  headers: mocks.headers,
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mocks.constructEvent },
    subscriptions: { retrieve: mocks.subscriptionsRetrieve },
  }),
}));

vi.mock("@/db/drizzle", () => ({
  default: {
    insert: mocks.insert,
    update: mocks.update,
  },
}));

vi.mock("@/db/schema", () => ({
  userSubscription: { stripeSubscriptionId: "stripe_subscription_id_col" },
}));

vi.mock("drizzle-orm", () => ({
  eq: mocks.eq,
}));

// ── import the handler under test ──────────────────────────────────────────
import { POST } from "./route";

// ── helpers ────────────────────────────────────────────────────────────────
function makeRequest(body = "raw_body") {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body,
  }) as unknown as Parameters<typeof POST>[0];
}

const MOCK_SUBSCRIPTION = {
  id: "sub_123",
  customer: "cus_456",
  items: {
    data: [
      {
        price: { id: "price_789" },
        current_period_end: 1700000000, // seconds
      },
    ],
  },
};

// ── tests ──────────────────────────────────────────────────────────────────
describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: headers() returns a Map-like with Stripe-Signature
    mocks.headers.mockResolvedValue(new Map([["Stripe-Signature", "sig_test"]]));

    // Default: subscriptions.retrieve returns our mock subscription
    mocks.subscriptionsRetrieve.mockResolvedValue(MOCK_SUBSCRIPTION);

    // Reset STRIPE_WEBHOOK_SECRET env var
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  // ── 1. constructEvent throws → 400 ──────────────────────────────────────
  it("returns 400 when constructEvent throws (invalid signature)", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain("Webhook error");

    // No db operations should have been called
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  // ── 2. checkout.session.completed – success ─────────────────────────────
  it("inserts subscription on checkout.session.completed with valid userId", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          subscription: "sub_123",
          metadata: { userId: "user_abc" },
        },
      },
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);

    // Verify subscriptions.retrieve was called
    expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_123");

    // Verify insert was called with the userSubscription table
    expect(mocks.insert).toHaveBeenCalledWith({
      stripeSubscriptionId: "stripe_subscription_id_col",
    });

    // Verify values was called with the right data
    expect(mocks.values).toHaveBeenCalledWith({
      userId: "user_abc",
      stripeSubscriptionId: "sub_123",
      stripeCustomerId: "cus_456",
      stripePriceId: "price_789",
      stripeCurrentPeriodEnd: new Date(1700000000 * 1000),
    });

    // No update should have been called
    expect(mocks.update).not.toHaveBeenCalled();
  });

  // ── 3a. checkout.session.completed – metadata undefined → 400 ───────────
  it("returns 400 when metadata is undefined on checkout.session.completed", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          subscription: "sub_123",
          metadata: undefined,
        },
      },
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toBe("User id is required.");

    // subscriptions.retrieve is still called before the metadata check
    expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_123");

    // insert().values() should NOT have been called
    expect(mocks.values).not.toHaveBeenCalled();
  });

  // ── 3b. checkout.session.completed – metadata null → 400 ────────────────
  it("returns 400 when metadata is null on checkout.session.completed", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          subscription: "sub_123",
          metadata: null,
        },
      },
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toBe("User id is required.");
    expect(mocks.values).not.toHaveBeenCalled();
  });

  // ── 3c. checkout.session.completed – metadata = {} (no userId) → 400 ───
  it("returns 400 when metadata has no userId on checkout.session.completed", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          subscription: "sub_123",
          metadata: {},
        },
      },
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toBe("User id is required.");
    expect(mocks.values).not.toHaveBeenCalled();
  });

  // ── 4. invoice.payment_succeeded – updates subscription ─────────────────
  it("updates subscription on invoice.payment_succeeded", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "invoice.payment_succeeded",
      data: {
        object: {
          subscription: "sub_123",
        },
      },
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);

    // Verify subscriptions.retrieve was called
    expect(mocks.subscriptionsRetrieve).toHaveBeenCalledWith("sub_123");

    // Verify update chain
    expect(mocks.update).toHaveBeenCalledWith({
      stripeSubscriptionId: "stripe_subscription_id_col",
    });

    expect(mocks.set).toHaveBeenCalledWith({
      stripePriceId: "price_789",
      stripeCurrentPeriodEnd: new Date(1700000000 * 1000),
    });

    expect(mocks.eq).toHaveBeenCalledWith("stripe_subscription_id_col", "sub_123");

    expect(mocks.where).toHaveBeenCalled();

    // No insert should have been called
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  // ── 5. Unrecognized event type → 200, no db operations ─────────────────
  it("returns 200 without db operations for unrecognized event type", async () => {
    mocks.constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: {
          subscription: "sub_999",
        },
      },
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);

    // No db operations
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.subscriptionsRetrieve).not.toHaveBeenCalled();
  });
});
