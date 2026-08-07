import { describe, expect, it } from "vitest";
import {
  createGuestProfile,
  normalizeDisplayName,
  normalizeIntro,
} from "./profile";

describe("guest profile", () => {
  it("keeps the initial nickname species aligned", () => {
    expect(createGuestProfile(() => 0)).toEqual({
      displayName: "다정한 곰",
      species: "bear",
      intro: "조용히 무언가를 만드는 중",
    });
  });

  it("normalizes empty and overlong profile text", () => {
    expect(normalizeDisplayName("   ")).toBe("나");
    expect(normalizeDisplayName("  여우  ")).toBe("여우");
    expect(normalizeIntro("a".repeat(40))).toBe("a".repeat(28));
  });
});
