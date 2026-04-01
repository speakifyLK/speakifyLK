import { describe, it, expect, beforeEach } from "vitest";

import { usePracticeModal } from "./use-practice-modal";

describe("use-practice-modal", () => {
  beforeEach(() => {
    usePracticeModal.getState().close();
  });

  it("starts closed", () => {
    expect(usePracticeModal.getState().isOpen).toBe(false);
  });

  it("opens", () => {
    usePracticeModal.getState().open();
    expect(usePracticeModal.getState().isOpen).toBe(true);
  });

  it("closes", () => {
    usePracticeModal.getState().open();
    usePracticeModal.getState().close();
    expect(usePracticeModal.getState().isOpen).toBe(false);
  });
});
