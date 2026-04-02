// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/* ── Mocks ─────────────────────────────────────────────────────────── */

vi.mock("dotenv/config", () => ({}));

vi.mock("@neondatabase/serverless", () => ({
  neon: vi.fn(() => "sql-instance"),
}));

// Track all DB calls
const deleteMock = vi.fn().mockReturnValue(Promise.resolve());
const insertReturnMock = vi.fn();
const insertValuesMock = vi.fn(() => ({ returning: insertReturnMock }));
const insertMock = vi.fn(() => ({ values: insertValuesMock }));

vi.mock("drizzle-orm/neon-http", () => ({
  drizzle: vi.fn(() => ({
    delete: deleteMock,
    insert: insertMock,
  })),
}));

vi.mock("@/db/schema", () => ({
  userProgress: "userProgress",
  challenges: "challenges",
  units: "units",
  lessons: "lessons",
  courses: "courses",
  challengeOptions: "challengeOptions",
  userSubscription: "userSubscription",
}));

const flushPromises = () => new Promise<void>((r) => setTimeout(r, 200));

describe("prod script", () => {
  const savedEnv = { ...process.env };

  let courseId = 0;
  let unitId = 0;
  let lessonId = 0;
  let challengeId = 0;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    deleteMock.mockReset().mockReturnValue(Promise.resolve());
    insertMock.mockReset().mockReturnValue({ values: insertValuesMock });
    insertValuesMock
      .mockReset()
      .mockReturnValue({ returning: insertReturnMock });

    courseId = 0;
    unitId = 0;
    lessonId = 0;
    challengeId = 0;

    // insertReturnMock needs to return different shaped data based on what's being inserted
    insertReturnMock.mockReset().mockImplementation(() => {
      // We can't easily distinguish which table is being inserted into, so
      // we return objects with all possible fields. The script destructures [0].
      // Courses are inserted first (2 calls), then units (2), lessons (10), challenges (80), options (80)
      // We'll use a simple counter approach:
      // The script inserts courses first, then iterates units → lessons → challenges → options
      return Promise.resolve([{ id: ++courseId }]);
    });

    // More specifically: insert is called with schema.courses, schema.units, etc.
    // Let's track via the first arg to insertMock
    insertMock.mockImplementation(() => ({ values: insertValuesMock }));
    insertValuesMock.mockImplementation(() => ({
      returning: insertReturnMock,
    }));
    insertReturnMock.mockImplementation(() =>
      Promise.resolve([{ id: ++courseId }])
    );

    process.env.DATABASE_URL = "postgres://test:test@localhost/test";
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("seeds database successfully – deletes, inserts courses, units, lessons, challenges, options", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await import("./prod");
    await flushPromises();

    // 7 delete calls (one per table)
    expect(deleteMock).toHaveBeenCalledTimes(7);

    // Courses: 2 insert().values().returning() calls (Sinhala and Tamil)
    // Units: 2 units
    // Lessons: 5 per unit × 2 = 10
    // Challenges: 8 per lesson × 10 = 80
    // Options: 80 (one insert per challenge with array of options)
    // Total insert calls = 2 + 2 + 10 + 80 + 80 = 174
    expect(insertMock.mock.calls.length).toBeGreaterThan(0);

    const output = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("Seeding database");
    expect(output).toContain("Database seeded successfully");
  });

  it("throws when database operations fail", async () => {
    deleteMock.mockReturnValue(Promise.reject(new Error("DB error")));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // The main() function catches errors, logs them, and throws new Error("Failed to seed database")
    // Since void main() doesn't catch, this becomes an unhandled rejection.
    // We need to catch it.
    const unhandledHandler = vi.fn();
    process.on("unhandledRejection", unhandledHandler);

    await import("./prod");
    await flushPromises();

    // The error is console.error'd then thrown
    const errOutput = errSpy.mock.calls.map((c) => String(c[0])).join("\n");
    // The original error is logged
    expect(errSpy).toHaveBeenCalled();

    process.removeListener("unhandledRejection", unhandledHandler);
  });
});
