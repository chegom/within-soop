export const FOREST_SPECIES = [
  "bear",
  "rabbit",
  "mole",
  "bird",
  "fox",
  "squirrel",
] as const;

export type ForestSpecies = (typeof FOREST_SPECIES)[number];

export const speciesLabel: Record<ForestSpecies, string> = {
  bear: "곰",
  rabbit: "토끼",
  mole: "두더지",
  bird: "새",
  fox: "여우",
  squirrel: "다람쥐",
};

export const DISPLAY_NAME_MAX_LENGTH = 24;
export const INTRO_MAX_LENGTH = 28;
export const ROOM_CAPACITY = 10;
export const ROOM_EMOTES = ["👋", "☕", "🔥", "✨"] as const;
export const HEARTBEAT_INTERVAL_MS = 4_000;
export const EMOTE_VISIBLE_MS = 4_000;
export const OFFLINE_AFTER_MS = 15_000;

export function isForestSpecies(value: string | null): value is ForestSpecies {
  return !!value && (FOREST_SPECIES as readonly string[]).includes(value);
}
