import { describe, expect, it } from "vitest";
import { buildSeats, isMemberOnline, isVisibleEmote } from "./state";

const member = {
  roomId: "room-1",
  userId: "user-1",
  displayName: "다정한 곰",
  species: "bear" as const,
  intro: "안녕",
  active: true,
  startedAt: 1_000,
  lastSeenAt: 5_000,
};

describe("room state", () => {
  it("marks a member offline only after the fifteen-second grace period", () => {
    expect(isMemberOnline(member, 20_000)).toBe(true);
    expect(isMemberOnline(member, 20_001)).toBe(false);
  });

  it("hides an emote at its exact expiry time", () => {
    const emote = { userId: "user-1", value: "✨", expiresAt: 9_000 };
    expect(isVisibleEmote(emote, 8_999)).toBe(true);
    expect(isVisibleEmote(emote, 9_000)).toBe(false);
  });

  it("reserves one of ten seats for the local member", () => {
    const peers = Array.from({ length: 10 }, (_, index) => ({
      ...member,
      userId: `user-${index + 2}`,
    }));

    const seats = buildSeats(member, peers);

    expect(seats).toHaveLength(10);
    expect(seats[0]).toMatchObject({ type: "self", data: { userId: "user-1" } });
    expect(seats.filter((seat) => seat.type === "member")).toHaveLength(9);
  });
});
