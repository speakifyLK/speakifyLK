import { describe, it, expect } from "vitest";

import { POINTS_TO_REFILL, MAX_HEARTS, QUESTS } from "./constants";

describe("constants", () => {
  it("POINTS_TO_REFILL is 10", () => {
    expect(POINTS_TO_REFILL).toBe(10);
  });

  it("MAX_HEARTS is 5", () => {
    expect(MAX_HEARTS).toBe(5);
  });

  it("QUESTS has 6 entries with correct structure", () => {
    expect(QUESTS).toHaveLength(6);
    for (const quest of QUESTS) {
      expect(quest).toHaveProperty("title");
      expect(quest).toHaveProperty("value");
      expect(typeof quest.title).toBe("string");
      expect(typeof quest.value).toBe("number");
    }
  });

  it("QUESTS values are in ascending order", () => {
    const values = QUESTS.map((q) => q.value);
    expect(values).toEqual([20, 50, 100, 250, 500, 1000]);
  });
});
