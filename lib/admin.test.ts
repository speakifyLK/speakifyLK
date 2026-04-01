import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @clerk/nextjs/server before importing the module under test
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
import { getIsAdmin } from "./admin";

const mockAuth = vi.mocked(auth);

describe("getIsAdmin", () => {
  const originalEnv = process.env.CLERK_ADMIN_IDS;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLERK_ADMIN_IDS = "admin1, admin2, admin3";
  });

  afterEach(() => {
    process.env.CLERK_ADMIN_IDS = originalEnv;
  });

  it("returns false when userId is null (unauthenticated)", async () => {
    mockAuth.mockResolvedValue({ userId: null } as never);
    expect(await getIsAdmin()).toBe(false);
  });

  it("returns true for a userId that is in the admin list", async () => {
    mockAuth.mockResolvedValue({ userId: "admin1" } as never);
    expect(await getIsAdmin()).toBe(true);
  });

  it("returns true for the second admin ID", async () => {
    mockAuth.mockResolvedValue({ userId: "admin2" } as never);
    expect(await getIsAdmin()).toBe(true);
  });

  it("returns true for the last admin ID", async () => {
    mockAuth.mockResolvedValue({ userId: "admin3" } as never);
    expect(await getIsAdmin()).toBe(true);
  });

  it("returns false for a userId not in the admin list", async () => {
    mockAuth.mockResolvedValue({ userId: "user123" } as never);
    expect(await getIsAdmin()).toBe(false);
  });

  it("returns false for an empty userId string", async () => {
    mockAuth.mockResolvedValue({ userId: "" } as never);
    // empty string is falsy — treated as unauthenticated
    expect(await getIsAdmin()).toBe(false);
  });
});
