import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist mocks ──────────────────────────────────────────────────────
const mockDbQuery = vi.hoisted(() => ({
  units: { findMany: vi.fn() },
  courses: { findMany: vi.fn() },
}));

vi.mock("./drizzle", () => {
  const fakeHelpers = {
    asc: (col: unknown) => ({ _type: "asc", col }),
    desc: (col: unknown) => ({ _type: "desc", col }),
  };
  const fakeTable = new Proxy(
    {},
    { get: (_t, prop) => `table.${String(prop)}` }
  );

  // Wrap findMany to invoke orderBy callbacks for branch coverage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapQuery = (mockFn: any) => {
    return (opts?: Record<string, unknown>) => {
      if (opts?.orderBy && typeof opts.orderBy === "function") {
        (opts.orderBy as (t: unknown, h: unknown) => unknown)(
          fakeTable,
          fakeHelpers
        );
      }
      // Recursively handle nested `with` that may contain orderBy callbacks
      if (opts?.with && typeof opts.with === "object") {
        const withObj = opts.with as Record<string, unknown>;
        for (const val of Object.values(withObj)) {
          if (
            val &&
            typeof val === "object" &&
            "orderBy" in (val as Record<string, unknown>)
          ) {
            const nested = val as Record<string, unknown>;
            if (typeof nested.orderBy === "function") {
              (nested.orderBy as (t: unknown, h: unknown) => unknown)(
                fakeTable,
                fakeHelpers
              );
            }
            // Handle deeper nesting (with.challenges inside with.lessons etc.)
            if (nested.with && typeof nested.with === "object") {
              for (const inner of Object.values(
                nested.with as Record<string, unknown>
              )) {
                if (
                  inner &&
                  typeof inner === "object" &&
                  "orderBy" in (inner as Record<string, unknown>)
                ) {
                  const innerNested = inner as Record<string, unknown>;
                  if (typeof innerNested.orderBy === "function") {
                    (
                      innerNested.orderBy as (t: unknown, h: unknown) => unknown
                    )(fakeTable, fakeHelpers);
                  }
                  // 4th level nesting
                  if (
                    innerNested.with &&
                    typeof innerNested.with === "object"
                  ) {
                    for (const deep of Object.values(
                      innerNested.with as Record<string, unknown>
                    )) {
                      if (
                        deep &&
                        typeof deep === "object" &&
                        "orderBy" in (deep as Record<string, unknown>)
                      ) {
                        const deepNested = deep as Record<string, unknown>;
                        if (typeof deepNested.orderBy === "function") {
                          (
                            deepNested.orderBy as (
                              t: unknown,
                              h: unknown
                            ) => unknown
                          )(fakeTable, fakeHelpers);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      return mockFn(opts);
    };
  };

  return {
    default: {
      query: {
        units: { findMany: wrapQuery(mockDbQuery.units.findMany) },
        courses: { findMany: wrapQuery(mockDbQuery.courses.findMany) },
      },
    },
  };
});

vi.mock("./schema", () => ({
  __esModule: true,
}));

import {
  getAllChallengesWithOptions,
  getAllLessonsWithContext,
  getCourseStructure,
} from "./export-queries";

describe("db/export-queries", () => {
  beforeEach(() => {
    mockDbQuery.units.findMany.mockReset();
    mockDbQuery.courses.findMany.mockReset();
  });

  // ── getAllChallengesWithOptions ─────────────────────────────────────
  describe("getAllChallengesWithOptions", () => {
    it("returns flattened lessons from all units", async () => {
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          lessons: [
            { id: 10, title: "L1", order: 1, unitId: 1, challenges: [] },
            { id: 11, title: "L2", order: 2, unitId: 1, challenges: [] },
          ],
        },
        {
          id: 2,
          lessons: [
            { id: 20, title: "L3", order: 1, unitId: 2, challenges: [] },
          ],
        },
      ]);

      const result = await getAllChallengesWithOptions();
      expect(result).toHaveLength(3);
      expect(result[0].title).toBe("L1");
      expect(result[2].title).toBe("L3");
    });

    it("returns empty array when no units", async () => {
      mockDbQuery.units.findMany.mockResolvedValue([]);
      const result = await getAllChallengesWithOptions();
      expect(result).toEqual([]);
    });
  });

  // ── getAllLessonsWithContext ────────────────────────────────────────
  describe("getAllLessonsWithContext", () => {
    it("returns lessons with parent unit and course context", async () => {
      mockDbQuery.units.findMany.mockResolvedValue([
        {
          id: 1,
          title: "Unit 1",
          order: 1,
          course: { id: 100, title: "Sinhala" },
          lessons: [
            { id: 10, title: "Greetings", order: 1, unitId: 1 },
            { id: 11, title: "Numbers", order: 2, unitId: 1 },
          ],
        },
      ]);

      const result = await getAllLessonsWithContext();
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Greetings");
      expect(result[0].unit.title).toBe("Unit 1");
      expect(result[0].unit.course.title).toBe("Sinhala");
    });

    it("returns empty array when no units", async () => {
      mockDbQuery.units.findMany.mockResolvedValue([]);
      const result = await getAllLessonsWithContext();
      expect(result).toEqual([]);
    });
  });

  // ── getCourseStructure ─────────────────────────────────────────────
  describe("getCourseStructure", () => {
    it("returns full course hierarchy", async () => {
      const courseData = [
        {
          id: 1,
          title: "Sinhala",
          imageSrc: "/sinhala.png",
          units: [
            {
              id: 10,
              title: "Basics",
              order: 1,
              lessons: [{ id: 100, title: "Hello", order: 1, challenges: [] }],
            },
          ],
        },
      ];
      mockDbQuery.courses.findMany.mockResolvedValue(courseData);

      const result = await getCourseStructure();
      expect(result).toEqual(courseData);
    });

    it("returns empty array when no courses", async () => {
      mockDbQuery.courses.findMany.mockResolvedValue([]);
      const result = await getCourseStructure();
      expect(result).toEqual([]);
    });
  });
});
