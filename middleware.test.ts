import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockProtect = vi.fn();
const mockCreateRouteMatcher = vi.fn();
const mockClerkMiddleware = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: mockClerkMiddleware,
  createRouteMatcher: mockCreateRouteMatcher,
}));

/** First matcher: public routes (controlled per test). Second: `/api(.*)` like production. */
const matcherState = { publicMatch: false };

describe("middleware", () => {
  const origBypassSecret = process.env.E2E_BYPASS_AUTH_SECRET;

  beforeEach(() => {
    vi.resetModules();
    matcherState.publicMatch = false;
    mockProtect.mockReset();
    mockCreateRouteMatcher.mockReset();
    mockClerkMiddleware.mockReset();

    mockCreateRouteMatcher.mockImplementation((patterns: string[]) => {
      if (patterns[0] === "/api(.*)") {
        return (req: { nextUrl: { pathname: string } }) =>
          String(req?.nextUrl?.pathname ?? "").startsWith("/api");
      }
      return () => matcherState.publicMatch;
    });

    mockClerkMiddleware.mockImplementation((cb: unknown) => cb);
  });

  afterEach(() => {
    if (origBypassSecret === undefined) {
      delete process.env.E2E_BYPASS_AUTH_SECRET;
    } else {
      process.env.E2E_BYPASS_AUTH_SECRET = origBypassSecret;
    }
  });

  it("exports a default middleware function", async () => {
    const mod = await import("./middleware");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("exports a config with matcher patterns", async () => {
    const mod = await import("./middleware");
    expect(mod.config).toBeDefined();
    expect(mod.config.matcher).toHaveLength(2);
  });

  it("creates route matcher for public routes and for /api(.*)", async () => {
    await import("./middleware");
    expect(mockCreateRouteMatcher).toHaveBeenCalledTimes(2);
    expect(mockCreateRouteMatcher).toHaveBeenNthCalledWith(1, [
      "/",
      "/sign-in(.*)",
      "/sign-up(.*)",
      "/api/webhooks/stripe",
    ]);
    expect(mockCreateRouteMatcher).toHaveBeenNthCalledWith(2, ["/api(.*)"]);
  });

  it("calls auth.protect() for non-public, non-API routes", async () => {
    await import("./middleware");

    const authObj = { protect: mockProtect };
    const request = { url: "/learn", nextUrl: { pathname: "/learn" }, headers: new Map() };

    const middlewareCallback = mockClerkMiddleware.mock.calls[0][0];
    await middlewareCallback(authObj, request);

    expect(mockProtect).toHaveBeenCalled();
  });

  it("does NOT call auth.protect() for public routes", async () => {
    matcherState.publicMatch = true;
    await import("./middleware");

    const authObj = { protect: mockProtect };
    const request = { url: "/", nextUrl: { pathname: "/" }, headers: new Map() };

    const middlewareCallback = mockClerkMiddleware.mock.calls[0][0];
    await middlewareCallback(authObj, request);

    expect(mockProtect).not.toHaveBeenCalled();
  });

  it("does NOT call auth.protect() for /api/* (handlers use auth())", async () => {
    await import("./middleware");

    const authObj = { protect: mockProtect };
    const request = {
      url: "/api/quiz/generate",
      nextUrl: { pathname: "/api/quiz/generate" },
      headers: new Map(),
    };

    const middlewareCallback = mockClerkMiddleware.mock.calls[0][0];
    await middlewareCallback(authObj, request);

    expect(mockProtect).not.toHaveBeenCalled();
  });

  it("does NOT call auth.protect() for Next.js Server Action POSTs (next-action header)", async () => {
    await import("./middleware");

    const authObj = { protect: mockProtect };
    const headers = new Map<string, string>();
    headers.set("next-action", "deadbeef");
    const request = {
      method: "POST",
      url: "/learn",
      nextUrl: { pathname: "/learn" },
      headers,
    };

    const middlewareCallback = mockClerkMiddleware.mock.calls[0][0];
    await middlewareCallback(authObj, request);

    expect(mockProtect).not.toHaveBeenCalled();
  });

  it("does NOT call auth.protect() if x-e2e-test-bypass header matches secret and not production", async () => {
    process.env.E2E_BYPASS_AUTH_SECRET = "test-secret";
    await import("./middleware");

    const authObj = { protect: mockProtect };
    const headers = new Map<string, string>();
    headers.set("x-e2e-test-bypass", "test-secret");
    const request = { url: "/api/chat", nextUrl: { pathname: "/api/chat" }, headers };

    const middlewareCallback = mockClerkMiddleware.mock.calls[0][0];
    await middlewareCallback(authObj, request);

    expect(mockProtect).not.toHaveBeenCalled();
  });

  it("does NOT call auth.protect() for /api/chat in production (API routes skip protect)", async () => {
    const origEnv = process.env.NODE_ENV;
    // @ts-expect-error -- overriding for test
    process.env.NODE_ENV = "production";
    process.env.E2E_BYPASS_AUTH_SECRET = "test-secret";

    await import("./middleware");

    const authObj = { protect: mockProtect };
    const headers = new Map<string, string>();
    headers.set("x-e2e-test-bypass", "test-secret");
    const request = { url: "/api/chat", nextUrl: { pathname: "/api/chat" }, headers };

    const middlewareCallback = mockClerkMiddleware.mock.calls[0][0];
    await middlewareCallback(authObj, request);

    expect(mockProtect).not.toHaveBeenCalled();

    // @ts-expect-error -- resetting
    process.env.NODE_ENV = origEnv;
  });

  it("still calls auth.protect() in production for non-API routes even with bypass header", async () => {
    const origEnv = process.env.NODE_ENV;
    // @ts-expect-error -- overriding for test
    process.env.NODE_ENV = "production";
    process.env.E2E_BYPASS_AUTH_SECRET = "test-secret";

    await import("./middleware");

    const authObj = { protect: mockProtect };
    const headers = new Map<string, string>();
    headers.set("x-e2e-test-bypass", "test-secret");
    const request = { url: "/learn", nextUrl: { pathname: "/learn" }, headers };

    const middlewareCallback = mockClerkMiddleware.mock.calls[0][0];
    await middlewareCallback(authObj, request);

    expect(mockProtect).toHaveBeenCalled();

    // @ts-expect-error -- resetting
    process.env.NODE_ENV = origEnv;
  });
});
