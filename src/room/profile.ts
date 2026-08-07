import {
  FOREST_SPECIES,
  speciesLabel,
  type ForestSpecies,
} from "../components/ForestCharacter";
import type { GuestProfile } from "./types";

const DEFAULT_INTRO = "조용히 무언가를 만드는 중";
const DEFAULT_DISPLAY_NAME = "나";
const GUEST_ADJECTIVES = [
  "다정한",
  "느긋한",
  "차분한",
  "포근한",
  "반짝이는",
  "용감한",
] as const;

function pickIndex(length: number, random: () => number) {
  const candidate = Math.floor(random() * length);
  return Number.isFinite(candidate) ? Math.min(Math.max(candidate, 0), length - 1) : 0;
}

export function normalizeDisplayName(value: string) {
  return value.trim().slice(0, 24) || DEFAULT_DISPLAY_NAME;
}

export function normalizeIntro(value: string) {
  return value.trim().slice(0, 28) || DEFAULT_INTRO;
}

export function pickRecommendedSpecies(random: () => number): ForestSpecies {
  return FOREST_SPECIES[pickIndex(FOREST_SPECIES.length, random)];
}

export function createGuestProfile(random: () => number): GuestProfile {
  const species = pickRecommendedSpecies(random);
  const adjective = GUEST_ADJECTIVES[pickIndex(GUEST_ADJECTIVES.length, random)];

  return {
    displayName: `${adjective} ${speciesLabel[species]}`,
    species,
    intro: DEFAULT_INTRO,
  };
}
