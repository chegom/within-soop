import { isForestSpecies } from "./constants";
import {
  createGuestProfile,
  normalizeDisplayName,
  normalizeIntro,
} from "./profile";
import type { GuestProfile } from "./types";

const DISPLAY_NAME_STORAGE_KEY = "gyeot:display-name";
const SPECIES_STORAGE_KEY = "gyeot:species";
const INTRO_STORAGE_KEY = "gyeot:intro";

export function loadGuestProfile(): GuestProfile {
  const savedSpecies = localStorage.getItem(SPECIES_STORAGE_KEY);
  const savedName = localStorage.getItem(DISPLAY_NAME_STORAGE_KEY);
  const savedIntro = localStorage.getItem(INTRO_STORAGE_KEY);

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
  localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, profile.displayName);
  localStorage.setItem(SPECIES_STORAGE_KEY, profile.species);
  localStorage.setItem(INTRO_STORAGE_KEY, profile.intro);
}
