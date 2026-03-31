import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock stripe before importing the module under test
const { MockStripe } = vi.hoisted(() => {
  const MockStripe = vi.fn().mockImplementation(function () {
    return { __mock: true };
  });
  return { MockStripe };
});
vi.mock("stripe", () => {
  return { default: MockStripe };
});

describe("getStripe", () => {
  beforeEach(async () => {
    vi.resetModules();
    MockStripe.mockClear();
    process.env.STRIPE_API_SECRET_KEY = "sk_test_mock_key";
  });

  it("returns a Stripe instance", async () => {
    const { getStripe } = await import("./stripe");
    const instance = getStripe();
    expect(instance).toBeDefined();
    expect(MockStripe).toHaveBeenCalledWith(
      "sk_test_mock_key",
      expect.any(Object)
    );
  });

  it("returns the same instance on subsequent calls (singleton)", async () => {
    const { getStripe } = await import("./stripe");
    const first = getStripe();
    const second = getStripe();
    expect(first).toBe(second);
  });

  it("initialises Stripe with the correct API version", async () => {
    const { getStripe } = await import("./stripe");
    getStripe();
    expect(MockStripe).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ apiVersion: "2026-02-25.clover" })
    );
  });

  it("initialises Stripe with typescript:true", async () => {
    const { getStripe } = await import("./stripe");
    getStripe();
    expect(MockStripe).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ typescript: true })
    );
  });
});
