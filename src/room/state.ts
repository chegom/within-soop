import type { RoomEmote, RoomMember, RoomSeat } from "./types";

const OFFLINE_AFTER_MS = 15_000;

export function isMemberOnline(member: RoomMember, nowMs: number) {
  return nowMs - member.lastSeenAt <= OFFLINE_AFTER_MS;
}

export function isVisibleEmote(emote: RoomEmote, nowMs: number) {
  return nowMs < emote.expiresAt;
}

export function buildSeats(self: RoomMember, peers: RoomMember[]): RoomSeat[] {
  const memberSeats = peers
    .filter((member) => member.userId !== self.userId)
    .slice(0, 9)
    .map((member): RoomSeat => ({ type: "member", data: member }));
  const seats: RoomSeat[] = [{ type: "self", data: self }, ...memberSeats];

  while (seats.length < 10) seats.push({ type: "empty" });
  return seats;
}
