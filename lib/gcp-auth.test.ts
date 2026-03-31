import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoist mocks so they are available when vi.mock factory runs
const { MockGoogleAuth } = vi.hoisted(() => {
  const MockGoogleAuth = vi.fn().mockImplementation(function () {
    return { getClient: vi.fn() };
  });
  return { MockGoogleAuth };
});

vi.mock("google-auth-library", () => {
  return { GoogleAuth: MockGoogleAuth };
});

describe("gcp-auth module", () => {
  const originalEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  beforeEach(() => {
    vi.resetModules();
    MockGoogleAuth.mockClear();
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
      type: "service_account",
      project_id: "test-project",
    });
  });

  afterEach(() => {
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY = originalEnv;
  });

  describe("getAccessToken", () => {
    it("returns a valid token", async () => {
      const mockGetClient = vi.fn().mockResolvedValue({
        getAccessToken: vi.fn().mockResolvedValue({ token: "mock-token-123" }),
      });
      MockGoogleAuth.mockImplementationOnce(function () {
        return { getClient: mockGetClient };
      });

      const { getAccessToken } = await import("./gcp-auth");
      const token = await getAccessToken();
      expect(token).toBe("mock-token-123");
    });

    it("throws when GOOGLE_SERVICE_ACCOUNT_KEY is not set", async () => {
      delete process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      const { getAccessToken } = await import("./gcp-auth");
      await expect(getAccessToken()).rejects.toThrow(
        "GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set"
      );
    });

    it("throws when GOOGLE_SERVICE_ACCOUNT_KEY is invalid JSON", async () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = "not-valid-json";
      const { getAccessToken } = await import("./gcp-auth");
      await expect(getAccessToken()).rejects.toThrow(
        "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON"
      );
    });

    it("throws when token response has no token", async () => {
      const mockGetClient = vi.fn().mockResolvedValue({
        getAccessToken: vi.fn().mockResolvedValue({ token: null }),
      });
      MockGoogleAuth.mockImplementationOnce(function () {
        return { getClient: mockGetClient };
      });

      const { getAccessToken } = await import("./gcp-auth");
      await expect(getAccessToken()).rejects.toThrow(
        "Failed to obtain OAuth2 access token from service account."
      );
    });

    it("returns a cached token on repeated calls within the same window", async () => {
      const mockGetAccessToken = vi
        .fn()
        .mockResolvedValue({ token: "cached-token" });
      const mockGetClient = vi.fn().mockResolvedValue({
        getAccessToken: mockGetAccessToken,
      });
      MockGoogleAuth.mockImplementation(function () {
        return { getClient: mockGetClient };
      });

      const { getAccessToken } = await import("./gcp-auth");
      const first = await getAccessToken();
      const second = await getAccessToken();

      expect(first).toBe("cached-token");
      expect(second).toBe("cached-token");
      // Auth client should only have been called once (cached on second call)
      expect(mockGetAccessToken).toHaveBeenCalledTimes(1);
    });
  });

  describe("getAuthHeaders", () => {
    it("returns an Authorization Bearer header with the token", async () => {
      const mockGetClient = vi.fn().mockResolvedValue({
        getAccessToken: vi.fn().mockResolvedValue({ token: "header-token" }),
      });
      MockGoogleAuth.mockImplementationOnce(function () {
        return { getClient: mockGetClient };
      });

      const { getAuthHeaders } = await import("./gcp-auth");
      const headers = await getAuthHeaders();
      expect(headers).toEqual({ Authorization: "Bearer header-token" });
    });
  });
});
