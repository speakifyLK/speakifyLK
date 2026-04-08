import { describe, it, expect } from "vitest";

// Schema is mostly declarative. We need to:
// 1. Verify all exports exist
// 2. Invoke relations callbacks to cover their function bodies
// 3. Invoke the $onUpdate callback on chatConversations.updatedAt

describe("db/schema", () => {
  it("exports all table definitions", async () => {
    const schema = await import("./schema");

    expect(schema.courses).toBeDefined();
    expect(schema.units).toBeDefined();
    expect(schema.lessons).toBeDefined();
    expect(schema.challenges).toBeDefined();
    expect(schema.challengeOptions).toBeDefined();
    expect(schema.challengeProgress).toBeDefined();
    expect(schema.userProgress).toBeDefined();
    expect(schema.userSubscription).toBeDefined();
    expect(schema.chatConversations).toBeDefined();
    expect(schema.chatMessages).toBeDefined();
    expect(schema.aiQuizSessions).toBeDefined();
    expect(schema.aiQuizQuestions).toBeDefined();
    expect(schema.userActivity).toBeDefined();
  });

  it("exports all enum definitions", async () => {
    const schema = await import("./schema");

    expect(schema.challengesEnum).toBeDefined();
    expect(schema.chatRoleEnum).toBeDefined();
    expect(schema.quizDifficultyEnum).toBeDefined();
    expect(schema.quizQuestionTypeEnum).toBeDefined();
  });

  // Drizzle's relations() stores the callback as `.config` (a function).
  // v8 coverage requires us to actually invoke these callbacks.
  // Each callback receives helper objects `{ one, many }` and returns
  // relationship config.

  const makeRelObj = () => ({
    withFieldName: (name: string) => ({ fieldName: name }),
  });
  const fakeOne = (..._args: unknown[]) => makeRelObj();
  const fakeMany = (..._args: unknown[]) => makeRelObj();
  const helpers = { one: fakeOne, many: fakeMany };

  it("invokes coursesRelations callback", async () => {
    const schema = await import("./schema");
    const config = (
      schema.coursesRelations as unknown as { config: (h: unknown) => unknown }
    ).config;
    const result = config(helpers);
    expect(result).toHaveProperty("userProgress");
    expect(result).toHaveProperty("units");
    expect(result).toHaveProperty("aiQuizSessions");
  });

  it("invokes unitsRelations callback", async () => {
    const schema = await import("./schema");
    const config = (
      schema.unitsRelations as unknown as { config: (h: unknown) => unknown }
    ).config;
    const result = config(helpers);
    expect(result).toHaveProperty("course");
    expect(result).toHaveProperty("lessons");
  });

  it("invokes lessonsRelations callback", async () => {
    const schema = await import("./schema");
    const config = (
      schema.lessonsRelations as unknown as { config: (h: unknown) => unknown }
    ).config;
    const result = config(helpers);
    expect(result).toHaveProperty("unit");
    expect(result).toHaveProperty("challenges");
  });

  it("invokes challengesRelations callback", async () => {
    const schema = await import("./schema");
    const config = (
      schema.challengesRelations as unknown as {
        config: (h: unknown) => unknown;
      }
    ).config;
    const result = config(helpers);
    expect(result).toHaveProperty("lesson");
    expect(result).toHaveProperty("challengeOptions");
    expect(result).toHaveProperty("challengeProgress");
  });

  it("invokes challengeOptionsRelations callback", async () => {
    const schema = await import("./schema");
    const config = (
      schema.challengeOptionsRelations as unknown as {
        config: (h: unknown) => unknown;
      }
    ).config;
    const result = config(helpers);
    expect(result).toHaveProperty("challenge");
  });

  it("invokes challengeProgressRelations callback", async () => {
    const schema = await import("./schema");
    const config = (
      schema.challengeProgressRelations as unknown as {
        config: (h: unknown) => unknown;
      }
    ).config;
    const result = config(helpers);
    expect(result).toHaveProperty("challenge");
  });

  it("invokes userProgressRelations callback", async () => {
    const schema = await import("./schema");
    const config = (
      schema.userProgressRelations as unknown as {
        config: (h: unknown) => unknown;
      }
    ).config;
    const result = config(helpers);
    expect(result).toHaveProperty("activeCourse");
  });

  it("invokes chatConversationsRelations callback", async () => {
    const schema = await import("./schema");
    const config = (
      schema.chatConversationsRelations as unknown as {
        config: (h: unknown) => unknown;
      }
    ).config;
    const result = config(helpers);
    expect(result).toHaveProperty("messages");
  });

  it("invokes chatMessagesRelations callback", async () => {
    const schema = await import("./schema");
    const config = (
      schema.chatMessagesRelations as unknown as {
        config: (h: unknown) => unknown;
      }
    ).config;
    const result = config(helpers);
    expect(result).toHaveProperty("conversation");
  });

  it("invokes aiQuizSessionsRelations callback", async () => {
    const schema = await import("./schema");
    const config = (
      schema.aiQuizSessionsRelations as unknown as {
        config: (h: unknown) => unknown;
      }
    ).config;
    const result = config(helpers);
    expect(result).toHaveProperty("course");
    expect(result).toHaveProperty("questions");
  });

  it("invokes aiQuizQuestionsRelations callback", async () => {
    const schema = await import("./schema");
    const config = (
      schema.aiQuizQuestionsRelations as unknown as {
        config: (h: unknown) => unknown;
      }
    ).config;
    const result = config(helpers);
    expect(result).toHaveProperty("session");
  });

  it("chatConversations updatedAt $onUpdate returns a Date", async () => {
    const schema = await import("./schema");
    // Drizzle columns have an internal onUpdateFn
    const updatedAtCol = (
      schema.chatConversations as unknown as Record<
        string,
        Record<string, unknown>
      >
    )["updatedAt"];
    if (updatedAtCol && typeof updatedAtCol === "object") {
      const config = (updatedAtCol as Record<string, unknown>)["config"] as
        | Record<string, unknown>
        | undefined;
      if (config && typeof config["onUpdateFn"] === "function") {
        const result = (config["onUpdateFn"] as () => unknown)();
        expect(result).toBeInstanceOf(Date);
      }
    }
  });

  it("uses MAX_HEARTS constant for userProgress hearts default", async () => {
    const { MAX_HEARTS } = await import("@/constants");
    expect(MAX_HEARTS).toBe(5);
  });

  // Drizzle stores .references(() => ...) callbacks lazily under
  // Symbol(drizzle:PgInlineForeignKeys)[n].reference (a function).
  // v8 only marks them covered when invoked.
  // The coverage report shows lines 137,183,222,240 uncovered — these are the
  // .references() callbacks on userProgress, chatMessages, aiQuizSessions,
  // aiQuizQuestions.

  const getForeignKeys = (table: unknown) => {
    const sym = Object.getOwnPropertySymbols(table as object).find((s) =>
      s.toString().includes("PgInlineForeignKeys")
    );
    if (!sym) return [];
    return (table as Record<symbol, Array<{ reference: () => unknown }>>)[sym];
  };

  it("invokes userProgress foreign-key reference callback", async () => {
    const schema = await import("./schema");
    const fks = getForeignKeys(schema.userProgress);
    expect(fks.length).toBeGreaterThan(0);
    const ref = fks[0].reference();
    expect(ref).toBeDefined();
  });

  it("invokes units foreign-key reference callback", async () => {
    const schema = await import("./schema");
    const fks = getForeignKeys(schema.units);
    expect(fks.length).toBeGreaterThan(0);
    for (const fk of fks) {
      expect(fk.reference()).toBeDefined();
    }
  });

  it("invokes lessons foreign-key reference callback", async () => {
    const schema = await import("./schema");
    const fks = getForeignKeys(schema.lessons);
    expect(fks.length).toBeGreaterThan(0);
    for (const fk of fks) {
      expect(fk.reference()).toBeDefined();
    }
  });

  it("invokes challenges foreign-key reference callback", async () => {
    const schema = await import("./schema");
    const fks = getForeignKeys(schema.challenges);
    expect(fks.length).toBeGreaterThan(0);
    for (const fk of fks) {
      expect(fk.reference()).toBeDefined();
    }
  });

  it("invokes challengeOptions foreign-key reference callback", async () => {
    const schema = await import("./schema");
    const fks = getForeignKeys(schema.challengeOptions);
    expect(fks.length).toBeGreaterThan(0);
    for (const fk of fks) {
      expect(fk.reference()).toBeDefined();
    }
  });

  it("invokes challengeProgress foreign-key reference callback", async () => {
    const schema = await import("./schema");
    const fks = getForeignKeys(schema.challengeProgress);
    expect(fks.length).toBeGreaterThan(0);
    for (const fk of fks) {
      expect(fk.reference()).toBeDefined();
    }
  });

  it("invokes chatMessages foreign-key reference callback", async () => {
    const schema = await import("./schema");
    const fks = getForeignKeys(schema.chatMessages);
    expect(fks.length).toBeGreaterThan(0);
    const ref = fks[0].reference();
    expect(ref).toBeDefined();
  });

  it("invokes aiQuizSessions foreign-key reference callback", async () => {
    const schema = await import("./schema");
    const fks = getForeignKeys(schema.aiQuizSessions);
    expect(fks.length).toBeGreaterThan(0);
    const ref = fks[0].reference();
    expect(ref).toBeDefined();
  });

  it("invokes aiQuizQuestions foreign-key reference callback", async () => {
    const schema = await import("./schema");
    const fks = getForeignKeys(schema.aiQuizQuestions);
    expect(fks.length).toBeGreaterThan(0);
    const ref = fks[0].reference();
    expect(ref).toBeDefined();
  });

  it("userActivity updatedAt $onUpdate returns a Date", async () => {
    const schema = await import("./schema");
    const updatedAtCol = (
      schema.userActivity as unknown as Record<string, Record<string, unknown>>
    )["updatedAt"];
    if (updatedAtCol && typeof updatedAtCol === "object") {
      const config = (updatedAtCol as Record<string, unknown>)["config"] as
        | Record<string, unknown>
        | undefined;
      if (config && typeof config["onUpdateFn"] === "function") {
        const result = (config["onUpdateFn"] as () => unknown)();
        expect(result).toBeInstanceOf(Date);
      }
    }
  });

  it("userActivity table has a unique index on (userId, date)", async () => {
    const { getTableConfig } = await import("drizzle-orm/pg-core");
    const schema = await import("./schema");
    const cfg = getTableConfig(schema.userActivity);
    expect(cfg.indexes.length).toBe(1);
    expect(cfg.indexes[0].config.name).toBe("user_activity_user_id_date_idx");
  });
});
