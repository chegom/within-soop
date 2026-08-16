import { isForestSpecies } from "./constants";
import {
  createGuestProfile,
  normalizeDisplayName,
  normalizeIntro,
} from "./profile";
import type { GuestProfile } from "./types";
import { readStoredValue, writeStoredValue } from "../storage";

const DISPLAY_NAME_STORAGE_KEY = "display-name";
const SPECIES_STORAGE_KEY = "species";
const INTRO_STORAGE_KEY = "intro";

export function loadGuestProfile(): GuestProfile {
  const savedSpecies = readStoredValue(SPECIES_STORAGE_KEY);
  const savedName = readStoredValue(DISPLAY_NAME_STORAGE_KEY);
  const savedIntro = readStoredValue(INTRO_STORAGE_KEY);

  if (savedName && isForestSpecies(savedSpecies)) {
    return {
      displayName: normalizeDisplayName(savedName),
      species: savedSpecies,
      intro: normalizeIntro(savedIntro ?? ""),
    };
  }

  const recommendation = createGuestProfile(Math.random);
  storeGuestProfile(recommendation);
  return recommendation;
}

export function storeGuestProfile(profile: GuestProfile) {
  writeStoredValue(DISPLAY_NAME_STORAGE_KEY, profile.displayName);
  writeStoredValue(SPECIES_STORAGE_KEY, profile.species);
  writeStoredValue(INTRO_STORAGE_KEY, profile.intro);
}
