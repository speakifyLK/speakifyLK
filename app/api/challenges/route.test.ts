import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetIsAdmin = vi.hoisted(() => vi.fn());
const mockDbInsert = vi.hoisted(() => vi.fn());
const mockDbQuery = vi.hoisted(() => ({
  challenges: { findMany: vi.fn() },
}));

vi.mock("@/lib/admin", () => ({ getIsAdmin: mockGetIsAdmin }));
vi.mock("@/db/schema", () => ({
  challenges: { id: "col_challenges.id" },
}));
vi.mock("@/db/drizzle", () => {
  const returningFn = vi.fn();
  const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });

  mockDbInsert.mockReturnValue({ values: valuesFn });

  return {
    default: {
      insert: mockDbInsert,
      query: {
        challenges: { findMany: mockDbQuery.challenges.findMany },
      },
    },
  };
});

import { GET, POST } from "./route";

describe("GET /api/challenges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not admin", async () => {
    mockGetIsAdmin.mockResolvedValue(false);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized.");
  });

  it("returns data when admin", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const mockData = [{ id: 1, question: "Challenge 1" }];
    mockDbQuery.challenges.findMany.mockResolvedValue(mockData);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockData);
  });
});

describe("POST /api/challenges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not admin", async () => {
    mockGetIsAdmin.mockResolvedValue(false);

    const request = new Request("http://localhost/api/challenges", {
      method: "POST",
      body: JSON.stringify({ question: "New Challenge" }),
    });

    const response = await POST(request as any);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized.");
  });

  it("creates and returns data when admin", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const body = { question: "New Challenge" };
    const mockCreated = { id: 1, question: "New Challenge" };

    const returningFn = vi.fn().mockResolvedValue([mockCreated]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert.mockReturnValue({ values: valuesFn });

    const request = new Request("http://localhost/api/challenges", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const response = await POST(request as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockCreated);
  });
});
