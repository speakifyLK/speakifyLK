import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetIsAdmin = vi.hoisted(() => vi.fn());
const mockDbInsert = vi.hoisted(() => vi.fn());
const mockDbQuery = vi.hoisted(() => ({
  challenges: { findMany: vi.fn() },
}));

vi.mock("drizzle-orm", () => ({ inArray: vi.fn() }));
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

const buildRequest = (params?: Record<string, string>) => {
  const url = new URL("http://localhost/api/challenges");
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url);
};

describe("GET /api/challenges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not admin", async () => {
    mockGetIsAdmin.mockResolvedValue(false);

    const response = await GET(buildRequest());

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized.");
  });

  it("returns all data with Content-Range when admin (no params)", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const mockData = [
      { id: 1, question: "Challenge 1" },
      { id: 2, question: "Challenge 2" },
    ];
    mockDbQuery.challenges.findMany.mockResolvedValue(mockData);

    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockData);
    expect(response.headers.get("Content-Range")).toBe("challenges 0-1/2");
  });

  it("filters by IDs when filter.id is provided (getMany)", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const filtered = [{ id: 2, question: "Challenge 2" }];
    mockDbQuery.challenges.findMany.mockResolvedValue(filtered);

    const response = await GET(buildRequest({ filter: JSON.stringify({ id: [2] }) }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(filtered);
    expect(response.headers.get("Content-Range")).toBe("challenges 0-0/1");
  });

  it("returns 400 when filter param is invalid JSON", async () => {
    mockGetIsAdmin.mockResolvedValue(true);

    const response = await GET(buildRequest({ filter: "not-valid-json" }));

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid filter parameter.");
  });

  it("returns 400 when range param is invalid JSON", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    mockDbQuery.challenges.findMany.mockResolvedValue([]);

    const response = await GET(buildRequest({ range: "not-valid-json" }));

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid range parameter.");
  });

  it("returns empty Content-Range when filter.id returns no results (getMany)", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    mockDbQuery.challenges.findMany.mockResolvedValue([]);

    const response = await GET(
      buildRequest({ filter: JSON.stringify({ id: [999] }) })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(response.headers.get("Content-Range")).toBe("challenges */0");
  });

  it("returns empty Content-Range when no data exists (no params)", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    mockDbQuery.challenges.findMany.mockResolvedValue([]);

    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(response.headers.get("Content-Range")).toBe("challenges */0");
  });

  it("returns empty Content-Range when range exceeds data (getList)", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const allData = [{ id: 1, question: "Challenge 1" }];
    mockDbQuery.challenges.findMany.mockResolvedValue(allData);

    const response = await GET(
      buildRequest({
        filter: JSON.stringify({}),
        range: JSON.stringify([5, 10]),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(response.headers.get("Content-Range")).toBe("challenges */1");
  });

  it("paginates when range is provided (getList)", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const allData = [
      { id: 1, question: "Challenge 1" },
      { id: 2, question: "Challenge 2" },
      { id: 3, question: "Challenge 3" },
    ];
    mockDbQuery.challenges.findMany.mockResolvedValue(allData);

    const response = await GET(
      buildRequest({
        filter: JSON.stringify({}),
        range: JSON.stringify([0, 1]),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([allData[0], allData[1]]);
    expect(response.headers.get("Content-Range")).toBe("challenges 0-1/3");
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
