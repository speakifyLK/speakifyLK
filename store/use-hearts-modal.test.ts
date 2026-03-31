import { describe, it, expect, beforeEach } from "vitest";

import { useHeartsModal } from "./use-hearts-modal";

describe("use-hearts-modal", () => {
  beforeEach(() => {
    useHeartsModal.getState().close();
  });

  it("starts closed", () => {
    expect(useHeartsModal.getState().isOpen).toBe(false);
  });

  it("opens", () => {
    useHeartsModal.getState().open();
    expect(useHeartsModal.getState().isOpen).toBe(true);
  });

  it("closes", () => {
    useHeartsModal.getState().open();
    useHeartsModal.getState().close();
    expect(useHeartsModal.getState().isOpen).toBe(false);
  });
});
