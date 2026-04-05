import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetIsAdmin = vi.hoisted(() => vi.fn());
const mockDbUpdate = vi.hoisted(() => vi.fn());
const mockDbDelete = vi.hoisted(() => vi.fn());
const mockDbQuery = vi.hoisted(() => ({
  lessons: { findFirst: vi.fn() },
}));

vi.mock("@/lib/admin", () => ({ getIsAdmin: mockGetIsAdmin }));
vi.mock("drizzle-orm", () => ({
  eq: (col: unknown, val: unknown) => ({ _type: "eq", col, val }),
}));
vi.mock("@/db/schema", () => ({
  lessons: { id: "col_lessons.id" },
}));
vi.mock("@/db/drizzle", () => {
  const returningFn = vi.fn();
  const whereFn = vi.fn().mockReturnValue({ returning: returningFn });
  const setFn = vi.fn().mockReturnValue({ where: whereFn });

  mockDbUpdate.mockReturnValue({ set: setFn });
  mockDbDelete.mockReturnValue({ where: whereFn });

  return {
    default: {
      update: mockDbUpdate,
      delete: mockDbDelete,
      query: {
        lessons: { findFirst: mockDbQuery.lessons.findFirst },
      },
    },
  };
});

import { GET, PUT, DELETE } from "./route";

const makeParams = (lessonId: string) => ({
  params: Promise.resolve({ lessonId }),
});

describe("GET /api/lessons/[lessonId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not admin", async () => {
    mockGetIsAdmin.mockResolvedValue(false);

    const response = await GET(
      new Request("http://localhost/api/lessons/1") as any,
      makeParams("1")
    );

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized.");
  });

  it("returns data when admin", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const mockData = { id: 1, title: "Lesson 1" };
    mockDbQuery.lessons.findFirst.mockResolvedValue(mockData);

    const response = await GET(
      new Request("http://localhost/api/lessons/1") as any,
      makeParams("1")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockData);
  });
});

describe("PUT /api/lessons/[lessonId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not admin", async () => {
    mockGetIsAdmin.mockResolvedValue(false);

    const request = new Request("http://localhost/api/lessons/1", {
      method: "PUT",
      body: JSON.stringify({ title: "Updated" }),
    });

    const response = await PUT(request as any, makeParams("1"));

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized.");
  });

  it("updates and returns data when admin", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const mockUpdated = { id: 1, title: "Updated" };

    const returningFn = vi.fn().mockResolvedValue([mockUpdated]);
    const whereFn = vi.fn().mockReturnValue({ returning: returningFn });
    const setFn = vi.fn().mockReturnValue({ where: whereFn });
    mockDbUpdate.mockReturnValue({ set: setFn });

    const request = new Request("http://localhost/api/lessons/1", {
      method: "PUT",
      body: JSON.stringify({ title: "Updated" }),
    });

    const response = await PUT(request as any, makeParams("1"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockUpdated);
  });
});

describe("DELETE /api/lessons/[lessonId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not admin", async () => {
    mockGetIsAdmin.mockResolvedValue(false);

    const response = await DELETE(
      new Request("http://localhost/api/lessons/1") as any,
      makeParams("1")
    );

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized.");
  });

  it("deletes and returns data when admin", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    const mockDeleted = { id: 1, title: "Lesson 1" };

    const returningFn = vi.fn().mockResolvedValue([mockDeleted]);
    const whereFn = vi.fn().mockReturnValue({ returning: returningFn });
    mockDbDelete.mockReturnValue({ where: whereFn });

    const response = await DELETE(
      new Request("http://localhost/api/lessons/1") as any,
      makeParams("1")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockDeleted);
  });
});
