import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetIsAdmin = vi.hoisted(() => vi.fn());
const mockDbInsert = vi.hoisted(() => vi.fn());
const mockDbQuery = vi.hoisted(() => ({
  lessons: { findMany: vi.fn() },
}));

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

describe("GET /api/lessons", () => {
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
    const mockData = [{ id: 1, title: "Lesson 1" }];
    mockDbQuery.lessons.findMany.mockResolvedValue(mockData);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockData);
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
