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

export function isForestSpecies(value: string | null): value is ForestSpecies {
  return !!value && (FOREST_SPECIES as readonly string[]).includes(value);
}

export function pickRandomForestSpecies(): ForestSpecies {
  return FOREST_SPECIES[Math.floor(Math.random() * FOREST_SPECIES.length)];
}

const INK = "#3A3428";
const EYE_HIGHLIGHT = "#FFFFFF";

type SpeciesRenderer = () => React.ReactNode;

// 종별 SVG는 이 레지스트리에만 등록한다. 나중에 이미지 에셋이 준비되면
// 해당 종의 렌더러만 <image href=...> 기반으로 바꾸면 호출부는 그대로다.
const speciesArt: Record<ForestSpecies, SpeciesRenderer> = {
  bear: () => (
    <>
      <circle cx="38" cy="16" r="10" fill="#A9744B" />
      <circle cx="82" cy="16" r="10" fill="#A9744B" />
      <circle cx="38" cy="17" r="5" fill="#D9A87C" />
      <circle cx="82" cy="17" r="5" fill="#D9A87C" />
      <path d="M37 76c0-14 10-23 23-23s23 9 23 23v12H37V76Z" fill="#8C5D3B" />
      <rect x="30" y="12" width="60" height="52" rx="26" fill="#A9744B" />
      <ellipse cx="60" cy="44" rx="14" ry="11" fill="#E8C29B" />
      <circle cx="49" cy="34" r="3.4" fill={INK} />
      <circle cx="71" cy="34" r="3.4" fill={INK} />
      <circle cx="48" cy="33" r="1" fill={EYE_HIGHLIGHT} />
      <circle cx="70" cy="33" r="1" fill={EYE_HIGHLIGHT} />
      <ellipse cx="60" cy="41" rx="4.4" ry="3.4" fill={INK} />
      <path d="M56 48c2.2 2 5.8 2 8 0" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  rabbit: () => (
    <>
      <path d="M42 22c-6-16-2-24 4-24 5 0 8 8 8 22" fill="#F3E4D3" />
      <path d="M78 22c6-16 2-24-4-24-5 0-8 8-8 22" fill="#F3E4D3" />
      <path d="M45 16c-3-10-1-16 2-16s5 6 5 15" fill="#F2B9C0" />
      <path d="M75 16c3-10 1-16-2-16s-5 6-5 15" fill="#F2B9C0" />
      <path d="M37 76c0-14 10-23 23-23s23 9 23 23v12H37V76Z" fill="#E7D2BB" />
      <rect x="30" y="14" width="60" height="50" rx="25" fill="#F3E4D3" />
      <circle cx="49" cy="36" r="3.4" fill={INK} />
      <circle cx="71" cy="36" r="3.4" fill={INK} />
      <circle cx="48" cy="35" r="1" fill={EYE_HIGHLIGHT} />
      <circle cx="70" cy="35" r="1" fill={EYE_HIGHLIGHT} />
      <path d="M58 42h4l-2 3-2-3Z" fill="#F2A0AA" />
      <path d="M56 48c2.2 2 5.8 2 8 0M60 45v3" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <circle cx="41" cy="45" r="4" fill="#F2B9C0" opacity="0.7" />
      <circle cx="79" cy="45" r="4" fill="#F2B9C0" opacity="0.7" />
    </>
  ),
  mole: () => (
    <>
      <circle cx="40" cy="18" r="6" fill="#6E5A50" />
      <circle cx="80" cy="18" r="6" fill="#6E5A50" />
      <path d="M37 76c0-14 10-23 23-23s23 9 23 23v12H37V76Z" fill="#5C4A41" />
      <rect x="30" y="14" width="60" height="50" rx="25" fill="#6E5A50" />
      <path d="M45 36c2-2.5 5-2.5 7 0M68 36c2-2.5 5-2.5 7 0" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="60" cy="44" rx="6.5" ry="5.5" fill="#F2A0AA" />
      <path d="M56 52c2.2 2 5.8 2 8 0" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 70c-6-1-10 2-11 7l12 3 3-9-4-1ZM80 70c6-1 10 2 11 7l-12 3-3-9 4-1Z" fill="#8A7266" />
    </>
  ),
  bird: () => (
    <>
      <path d="M54 8c1-5 5-7 6-2 1-5 5-3 6 2l-6 6-6-6Z" fill="#E8A13F" />
      <path d="M37 74c0-16 10-26 23-26s23 10 23 26v14H37V74Z" fill="#7FB6D9" />
      <rect x="30" y="14" width="60" height="50" rx="25" fill="#9CCBE8" />
      <path d="M36 62c-8 2-12 8-12 15 8 0 14-3 18-8l-6-7ZM84 62c8 2 12 8 12 15-8 0-14-3-18-8l6-7Z" fill="#7FB6D9" />
      <ellipse cx="60" cy="72" rx="13" ry="10" fill="#F6E7C8" />
      <circle cx="49" cy="35" r="3.4" fill={INK} />
      <circle cx="71" cy="35" r="3.4" fill={INK} />
      <circle cx="48" cy="34" r="1" fill={EYE_HIGHLIGHT} />
      <circle cx="70" cy="34" r="1" fill={EYE_HIGHLIGHT} />
      <path d="M54 42h12l-6 8-6-8Z" fill="#E8A13F" />
      <circle cx="41" cy="43" r="4" fill="#F2B9C0" opacity="0.55" />
      <circle cx="79" cy="43" r="4" fill="#F2B9C0" opacity="0.55" />
    </>
  ),
  fox: () => (
    <>
      <path d="M33 24 27 4l18 9-12 11ZM87 24l6-20-18 9 12 11Z" fill="#E8853C" />
      <path d="M35 18l-4-10 9 5-5 5ZM85 18l4-10-9 5 5 5Z" fill="#F6E7C8" />
      <path d="M37 76c0-14 10-23 23-23s23 9 23 23v12H37V76Z" fill="#D9772F" />
      <rect x="30" y="14" width="60" height="50" rx="25" fill="#E8853C" />
      <path d="M60 64c-12 0-20-6-22-16 6 2 12 3 22 3s16-1 22-3c-2 10-10 16-22 16Z" fill="#F6E7C8" />
      <circle cx="49" cy="35" r="3.4" fill={INK} />
      <circle cx="71" cy="35" r="3.4" fill={INK} />
      <circle cx="48" cy="34" r="1" fill={EYE_HIGHLIGHT} />
      <circle cx="70" cy="34" r="1" fill={EYE_HIGHLIGHT} />
      <ellipse cx="60" cy="45" rx="4" ry="3.2" fill={INK} />
      <path d="M56 51c2.2 2 5.8 2 8 0" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  squirrel: () => (
    <>
      <path d="M88 72c14-4 18-22 8-34 4 14-2 22-10 24l2 10Z" fill="#B4693A" />
      <path d="M90 70c10-4 13-16 7-25 1 10-4 16-10 18l3 7Z" fill="#D98F55" />
      <path d="M40 20c-4-8 0-14 5-13 4 1 6 6 5 12l-10 1ZM80 20c4-8 0-14-5-13-4 1-6 6-5 12l10 1Z" fill="#C97B45" />
      <path d="M37 76c0-14 10-23 23-23s23 9 23 23v12H37V76Z" fill="#B4693A" />
      <rect x="30" y="14" width="60" height="50" rx="25" fill="#C97B45" />
      <ellipse cx="60" cy="46" rx="12" ry="9" fill="#F0D6B3" />
      <circle cx="49" cy="35" r="3.4" fill={INK} />
      <circle cx="71" cy="35" r="3.4" fill={INK} />
      <circle cx="48" cy="34" r="1" fill={EYE_HIGHLIGHT} />
      <circle cx="70" cy="34" r="1" fill={EYE_HIGHLIGHT} />
      <ellipse cx="60" cy="43" rx="3.6" ry="3" fill={INK} />
      <path d="M55 49c2 2.5 8 2.5 10 0M60 46v3" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
};

type ForestCharacterProps = {
  species: ForestSpecies;
  active?: boolean;
  emote?: string | null;
};

export function ForestCharacter({
  species,
  active = true,
  emote,
}: ForestCharacterProps) {
  return (
    <div
      className={`desk-character forest-character species-${species} ${
        active ? "is-working" : "is-away"
      }`}
    >
      {emote && <span className="character-emote">{emote}</span>}
      <svg viewBox="0 0 120 100" aria-hidden="true">
        <ellipse cx="60" cy="91" rx="38" ry="6" fill="#3A3428" opacity="0.12" />
        {speciesArt[species]()}
      </svg>
    </div>
  );
}
