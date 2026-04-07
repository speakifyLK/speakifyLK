import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetIsAdmin = vi.hoisted(() => vi.fn());
const mockDbInsert = vi.hoisted(() => vi.fn());
const mockDbQuery = vi.hoisted(() => ({
  lessons: { findMany: vi.fn() },
}));

vi.mock("drizzle-orm", () => ({ inArray: vi.fn() }));
vi.mock("@/lib/admin", () => ({ getIsAdmin: mockGetIsAdmin }));
vi.mock("@/db/schema", () => ({
  lessons: { id: "col_lessons.id" },
}));
vi.mock("@/db/drizzle", () => {
  const returningFn = vi.fn();
  const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });

  mockDbInsert.mockReturnValue({ values: valuesFn });

  return {
    default: {
      insert: mockDbInsert,
      query: {
        lessons: { findMany: mockDbQuery.lessons.findMany },
      },
    },
  };
});

import { GET, POST } from "./route";

const buildRequest = (params?: Record<string, string>) => {
  const url = new URL("http://localhost/api/lessons");
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url);
};

describe("GET /api/lessons", () => {
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
      { id: 1, title: "Lesson 1" },
      { id: 2, title: "Lesson 2" },
    ];
    mockDbQuery.lessons.findMany.mockResolvedValue(mockData);

    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockData);
    expect(response.headers.get("Content-Range")).toBe("lessons 0-1/2");
  });

  it("filters by IDs when filter.id is provided (getMany)", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const filtered = [{ id: 2, title: "Lesson 2" }];
    mockDbQuery.lessons.findMany.mockResolvedValue(filtered);

    const response = await GET(buildRequest({ filter: JSON.stringify({ id: [2] }) }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(filtered);
    expect(response.headers.get("Content-Range")).toBe("lessons 0-0/1");
  });

  it("returns 400 when filter param is invalid JSON", async () => {
    mockGetIsAdmin.mockResolvedValue(true);

    const response = await GET(buildRequest({ filter: "not-valid-json" }));

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid filter parameter.");
  });

  it("returns 400 when range param is invalid JSON", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    mockDbQuery.lessons.findMany.mockResolvedValue([]);

    const response = await GET(buildRequest({ range: "not-valid-json" }));

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid range parameter.");
  });

  it("returns empty Content-Range when filter.id returns no results (getMany)", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    mockDbQuery.lessons.findMany.mockResolvedValue([]);

    const response = await GET(buildRequest({ filter: JSON.stringify({ id: [999] }) }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(response.headers.get("Content-Range")).toBe("lessons */0");
  });

  it("returns empty Content-Range when no data exists (no params)", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    mockDbQuery.lessons.findMany.mockResolvedValue([]);

    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(response.headers.get("Content-Range")).toBe("lessons */0");
  });

  it("returns empty Content-Range when range exceeds data (getList)", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const allData = [{ id: 1, title: "Lesson 1" }];
    mockDbQuery.lessons.findMany.mockResolvedValue(allData);

    const response = await GET(
      buildRequest({
        filter: JSON.stringify({}),
        range: JSON.stringify([5, 10]),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(response.headers.get("Content-Range")).toBe("lessons */1");
  });

  it("paginates when range is provided (getList)", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const allData = [
      { id: 1, title: "Lesson 1" },
      { id: 2, title: "Lesson 2" },
      { id: 3, title: "Lesson 3" },
    ];
    mockDbQuery.lessons.findMany.mockResolvedValue(allData);

    const response = await GET(
      buildRequest({
        filter: JSON.stringify({}),
        range: JSON.stringify([0, 1]),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([allData[0], allData[1]]);
    expect(response.headers.get("Content-Range")).toBe("lessons 0-1/3");
  });

  it("filters by q search term (case-insensitive)", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const allData = [
      { id: 1, title: "Basic Greetings" },
      { id: 2, title: "Advanced Grammar" },
      { id: 3, title: "Basic Numbers" },
    ];
    mockDbQuery.lessons.findMany.mockResolvedValue(allData);

    const response = await GET(
      buildRequest({ filter: JSON.stringify({ q: "basic" }) })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([allData[0], allData[2]]);
    expect(response.headers.get("Content-Range")).toBe("lessons 0-1/2");
  });

  it("returns all data when q filter is empty string", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const allData = [
      { id: 1, title: "Lesson 1" },
      { id: 2, title: "Lesson 2" },
    ];
    mockDbQuery.lessons.findMany.mockResolvedValue(allData);

    const response = await GET(
      buildRequest({ filter: JSON.stringify({ q: "" }) })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(allData);
    expect(response.headers.get("Content-Range")).toBe("lessons 0-1/2");
  });
});

describe("POST /api/lessons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not admin", async () => {
    mockGetIsAdmin.mockResolvedValue(false);

    const request = new Request("http://localhost/api/lessons", {
      method: "POST",
      body: JSON.stringify({ title: "New Lesson" }),
    });

    const response = await POST(request as any);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized.");
  });

  it("creates and returns data when admin", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const body = { title: "New Lesson" };
    const mockCreated = { id: 1, title: "New Lesson" };

    const returningFn = vi.fn().mockResolvedValue([mockCreated]);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbInsert.mockReturnValue({ values: valuesFn });

    const request = new Request("http://localhost/api/lessons", {
      method: "POST",
      body: JSON.stringify(body),
    });

    const response = await POST(request as any);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockCreated);
  });
});
