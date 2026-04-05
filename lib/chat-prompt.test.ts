import { describe, it, expect } from "vitest";
import { SINHALA_TUTOR_PROMPT } from "./chat-prompt";

describe("SINHALA_TUTOR_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof SINHALA_TUTOR_PROMPT).toBe("string");
    expect(SINHALA_TUTOR_PROMPT.trim().length).toBeGreaterThan(0);
  });

  it("identifies the assistant as SpeakifyLK Assistant", () => {
    expect(SINHALA_TUTOR_PROMPT).toContain("SpeakifyLK Assistant");
  });

  it("mentions Sinhala language", () => {
    expect(SINHALA_TUTOR_PROMPT).toContain("Sinhala");
  });

  it("contains grammar feedback rule", () => {
    expect(SINHALA_TUTOR_PROMPT).toContain("GRAMMAR FEEDBACK");
  });

  it("contains adaptivity rule for beginners and advanced learners", () => {
    expect(SINHALA_TUTOR_PROMPT).toContain("beginners");
    expect(SINHALA_TUTOR_PROMPT).toContain("advanced");
  });

  it("contains STRICT RULES section", () => {
    expect(SINHALA_TUTOR_PROMPT).toContain("STRICT RULES");
  });

  it("contains PERSONA section", () => {
    expect(SINHALA_TUTOR_PROMPT).toContain("PERSONA");
  });
});
