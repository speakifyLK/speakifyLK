import { describe, it, expect, vi, beforeEach } from "vitest";

const mockProtect = vi.fn();
const mockAuth = vi.fn().mockResolvedValue({ protect: mockProtect });
const mockCreateRouteMatcher = vi.fn();
const mockClerkMiddleware = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: mockClerkMiddleware,
  createRouteMatcher: mockCreateRouteMatcher,
}));

describe("middleware", () => {
  let routeMatcherCallback: (req: unknown) => boolean;

  beforeEach(() => {
    vi.resetModules();
    mockProtect.mockReset();
    mockAuth.mockReset().mockResolvedValue({ protect: mockProtect });
    mockCreateRouteMatcher.mockReset();
    mockClerkMiddleware.mockReset();

    // Capture the route matcher function and the middleware callback
    mockCreateRouteMatcher.mockImplementation(() => {
      routeMatcherCallback = () => false;
      return (req: unknown) => routeMatcherCallback(req);
    });

    mockClerkMiddleware.mockImplementation((cb: unknown) => cb);
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

  it("creates route matcher with correct public routes", async () => {
    await import("./middleware");
    expect(mockCreateRouteMatcher).toHaveBeenCalledWith([
      "/",
      "/sign-in(.*)",
      "/sign-up(.*)",
      "/api/webhooks/stripe",
    ]);
  });

  it("calls auth.protect() for non-public routes", async () => {
    // Make isPublicRoute return false
    mockCreateRouteMatcher.mockImplementation(() => () => false);
    mockClerkMiddleware.mockImplementation((cb: unknown) => cb);

    await import("./middleware");

    const authObj = { protect: mockProtect };
    const request = { url: "/learn", nextUrl: { pathname: "/learn" }, headers: new Map() };

    // Get the callback that was passed to clerkMiddleware
    const middlewareCallback = mockClerkMiddleware.mock.calls[0][0];
    await middlewareCallback(authObj, request);

    expect(mockProtect).toHaveBeenCalled();
  });

  it("does NOT call auth.protect() for public routes", async () => {
    // Make isPublicRoute return true
    mockCreateRouteMatcher.mockImplementation(() => () => true);
    mockClerkMiddleware.mockImplementation((cb: unknown) => cb);

    await import("./middleware");

    const authObj = { protect: mockProtect };
    const request = { url: "/", nextUrl: { pathname: "/" }, headers: new Map() };

    const middlewareCallback = mockClerkMiddleware.mock.calls[0][0];
    await middlewareCallback(authObj, request);

    expect(mockProtect).not.toHaveBeenCalled();
  });

  it("does NOT call auth.protect() if x-e2e-test-bypass header matches secret and not production", async () => {
    mockCreateRouteMatcher.mockImplementation(() => () => false);
    mockClerkMiddleware.mockImplementation((cb: unknown) => cb);

    process.env.E2E_BYPASS_AUTH_SECRET = "test-secret";
    await import("./middleware");

    const authObj = { protect: mockProtect };
    const headers = new Map();
    headers.set("x-e2e-test-bypass", "test-secret");
    const request = { url: "/api/chat", nextUrl: { pathname: "/api/chat" }, headers };

    const middlewareCallback = mockClerkMiddleware.mock.calls[0][0];
    await middlewareCallback(authObj, request);

    expect(mockProtect).not.toHaveBeenCalled();
  });

  it("CALLS auth.protect() if x-e2e-test-bypass matches but environment is production", async () => {
    mockCreateRouteMatcher.mockImplementation(() => () => false);
    mockClerkMiddleware.mockImplementation((cb: unknown) => cb);

    const origEnv = process.env.NODE_ENV;
    // @ts-expect-error -- overriding for test
    process.env.NODE_ENV = "production";
    process.env.E2E_BYPASS_AUTH_SECRET = "test-secret";

    await import("./middleware");

    const authObj = { protect: mockProtect };
    const headers = new Map();
    headers.set("x-e2e-test-bypass", "test-secret");
    const request = { url: "/api/chat", nextUrl: { pathname: "/api/chat" }, headers };

    const middlewareCallback = mockClerkMiddleware.mock.calls[0][0];
    await middlewareCallback(authObj, request);

    expect(mockProtect).toHaveBeenCalled();

    // @ts-expect-error -- resetting
    process.env.NODE_ENV = origEnv;
  });
});
