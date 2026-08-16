// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { readStoredValue, removeStoredValue, writeStoredValue } from "./storage";

describe("rebranded local storage", () => {
  beforeEach(() => localStorage.clear());

  it("migrates a legacy value when the new key is missing", () => {
    localStorage.setItem("gyeot:view-mode", "compact");

    expect(readStoredValue("view-mode")).toBe("compact");
    expect(localStorage.getItem("within-soop:view-mode")).toBe("compact");
  });

  it("prefers and writes the WITHIN SOOP namespace", () => {
    localStorage.setItem("gyeot:intro", "예전 소개");
    writeStoredValue("intro", "새 소개");

    expect(readStoredValue("intro")).toBe("새 소개");
  });

  it("clears current and legacy room state together", () => {
    localStorage.setItem("within-soop:active-room-id", "new-room");
    localStorage.setItem("gyeot:active-room-id", "old-room");

    removeStoredValue("active-room-id");

    expect(localStorage.getItem("within-soop:active-room-id")).toBeNull();
    expect(localStorage.getItem("gyeot:active-room-id")).toBeNull();
  });
});
