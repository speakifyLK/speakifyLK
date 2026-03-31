import { describe, it, expect, beforeEach } from "vitest";

import { useExitModal } from "./use-exit-modal";

describe("use-exit-modal", () => {
  beforeEach(() => {
    useExitModal.getState().close();
  });

  it("starts closed", () => {
    expect(useExitModal.getState().isOpen).toBe(false);
  });

  it("opens", () => {
    useExitModal.getState().open();
    expect(useExitModal.getState().isOpen).toBe(true);
  });

  it("closes", () => {
    useExitModal.getState().open();
    useExitModal.getState().close();
    expect(useExitModal.getState().isOpen).toBe(false);
  });
});
