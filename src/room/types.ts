import type { ForestSpecies } from "../components/ForestCharacter";

export type GuestProfile = {
  displayName: string;
  species: ForestSpecies;
  intro: string;
};

export type RoomMember = GuestProfile & {
  roomId: string;
  userId: string;
  active: boolean;
  startedAt: number | null;
  lastSeenAt: number;
};

export type RoomEmote = {
  userId: string;
  value: string;
  expiresAt: number;
};

export type RoomConnectionState =
  | "unconfigured"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export type RoomSeat =
  | { type: "self"; data: RoomMember }
  | { type: "member"; data: RoomMember }
  | { type: "empty" };
