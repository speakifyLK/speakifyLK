import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetIsAdmin = vi.hoisted(() => vi.fn());
const mockDbInsert = vi.hoisted(() => vi.fn());
const mockDbQuery = vi.hoisted(() => ({
  units: { findMany: vi.fn() },
}));

vi.mock("drizzle-orm", () => ({ inArray: vi.fn() }));
vi.mock("@/lib/admin", () => ({ getIsAdmin: mockGetIsAdmin }));
vi.mock("@/db/schema", () => ({
  units: { id: "col_units.id" },
}));
vi.mock("@/db/drizzle", () => {
  const returningFn = vi.fn();
  const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });

  mockDbInsert.mockReturnValue({ values: valuesFn });

  return {
    default: {
      insert: mockDbInsert,
      query: {
        units: { findMany: mockDbQuery.units.findMany },
      },
    },
  };
});

import { GET, POST } from "./route";

const buildRequest = (params?: Record<string, string>) => {
  const url = new URL("http://localhost/api/units");
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url);
};

describe("GET /api/units", () => {
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
      { id: 1, title: "Unit 1" },
      { id: 2, title: "Unit 2" },
    ];
    mockDbQuery.units.findMany.mockResolvedValue(mockData);

    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockData);
    expect(response.headers.get("Content-Range")).toBe("units 0-1/2");
  });

  it("filters by IDs when filter.id is provided (getMany)", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const filtered = [{ id: 2, title: "Unit 2" }];
    mockDbQuery.units.findMany.mockResolvedValue(filtered);

    const response = await GET(
      buildRequest({ filter: JSON.stringify({ id: [2] }) })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(filtered);
    expect(response.headers.get("Content-Range")).toBe("units 0-1/1");
  });

  it("paginates when range is provided (getList)", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const allData = [
      { id: 1, title: "Unit 1" },
      { id: 2, title: "Unit 2" },
      { id: 3, title: "Unit 3" },
    ];
    mockDbQuery.units.findMany.mockResolvedValue(allData);

    const response = await GET(
      buildRequest({
        filter: JSON.stringify({}),
        range: JSON.stringify([0, 1]),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([allData[0], allData[1]]);
    expect(response.headers.get("Content-Range")).toBe("units 0-1/3");
  });
});

describe("POST /api/units", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not admin", async () => {
    mockGetIsAdmin.mockResolvedValue(false);

    const request = new Request("http://localhost/api/units", {
      method: "POST",
      body: JSON.stringify({ title: "New Unit" }),
    });

    const response = await POST(request as any);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized.");
  });

  it("creates and returns data when admin", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const body = { title: "New Unit" };
    const mockCreated = { id: 1, title: "New Unit" };

    const returningFn = vi.fn().mockResolvedValue([mockCreated]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert.mockReturnValue({ values: valuesFn });

    const request = new Request("http://localhost/api/units", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const response = await POST(request as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockCreated);
  });
});
