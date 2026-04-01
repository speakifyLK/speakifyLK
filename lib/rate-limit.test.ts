import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// ═══════════════════════════════════════════════════════════════════════
// checkRateLimit — In-memory rate limiter
// ═══════════════════════════════════════════════════════════════════════

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request for a user", async () => {
    const { checkRateLimit } = await import("./rate-limit");
    expect(checkRateLimit("user-1")).toBeNull();
  });

  it("allows up to 20 requests within the window", async () => {
    const { checkRateLimit } = await import("./rate-limit");
    for (let i = 0; i < 20; i++) {
      expect(checkRateLimit("user-2")).toBeNull();
    }
  });

  it("blocks the 21st request within the window", async () => {
    const { checkRateLimit } = await import("./rate-limit");
    for (let i = 0; i < 20; i++) {
      checkRateLimit("user-3");
    }
    const result = checkRateLimit("user-3");
    expect(result).not.toBeNull();
    expect(result!.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("returns retryAfterSeconds that is <= 3600", async () => {
    const { checkRateLimit } = await import("./rate-limit");
    for (let i = 0; i < 20; i++) {
      checkRateLimit("user-4");
    }
    const result = checkRateLimit("user-4");
    expect(result!.retryAfterSeconds).toBeLessThanOrEqual(3600);
  });

  it("resets after the 1-hour window expires", async () => {
    const { checkRateLimit } = await import("./rate-limit");
    // Exhaust rate limit
    for (let i = 0; i < 20; i++) {
      checkRateLimit("user-5");
    }
    expect(checkRateLimit("user-5")).not.toBeNull();

    // Advance time past 1 hour
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);

    // Should be allowed again
    expect(checkRateLimit("user-5")).toBeNull();
  });

  it("tracks users independently", async () => {
    const { checkRateLimit } = await import("./rate-limit");
    // Exhaust rate limit for user-A
    for (let i = 0; i < 20; i++) {
      checkRateLimit("user-A");
    }
    expect(checkRateLimit("user-A")).not.toBeNull();

    // user-B should still be allowed
    expect(checkRateLimit("user-B")).toBeNull();
  });

  it("decreases retryAfterSeconds as time passes", async () => {
    const { checkRateLimit } = await import("./rate-limit");
    for (let i = 0; i < 20; i++) {
      checkRateLimit("user-6");
    }

    const first = checkRateLimit("user-6");
    expect(first).not.toBeNull();

    // Advance 30 minutes
    vi.advanceTimersByTime(30 * 60 * 1000);

    const later = checkRateLimit("user-6");
    expect(later).not.toBeNull();
    expect(later!.retryAfterSeconds).toBeLessThan(first!.retryAfterSeconds);
  });
});
