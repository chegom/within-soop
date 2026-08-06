export type CharacterTone = "lilac" | "mint" | "peach" | "lemon" | "sky" | "rose";

const tones: Record<CharacterTone, { face: string; body: string; accent: string }> = {
  lilac: { face: "#A59BEA", body: "#6F72CA", accent: "#F3B6A4" },
  mint: { face: "#91D0B4", body: "#4E9E80", accent: "#F5C46B" },
  peach: { face: "#F2A488", body: "#D87568", accent: "#8D86D8" },
  lemon: { face: "#F2CE70", body: "#C99C3B", accent: "#769BD0" },
  sky: { face: "#91BCE3", body: "#5F88BC", accent: "#F19A87" },
  rose: { face: "#E9A1B6", body: "#BB6F91", accent: "#79BCA0" },
};

type DeskCharacterProps = {
  tone: CharacterTone;
  variant?: number;
  active?: boolean;
  emote?: string | null;
};

export function DeskCharacter({
  tone,
  variant = 0,
  active = true,
  emote,
}: DeskCharacterProps) {
  const palette = tones[tone];
  const eyeY = variant % 2 === 0 ? 35 : 36;

  return (
    <div className={`desk-character tone-${tone} ${active ? "is-working" : "is-away"}`}>
      {emote && <span className="character-emote">{emote}</span>}
      <svg viewBox="0 0 120 100" aria-hidden="true">
        <ellipse cx="60" cy="91" rx="38" ry="6" fill="#37384F" opacity="0.1" />
        <path d="M37 75c0-15 10-25 23-25s23 10 23 25v13H37V75Z" fill={palette.body} />
        <path d="M42 72c-6 3-10 8-11 15h15l4-13-8-2ZM78 72c6 3 10 8 11 15H74l-4-13 8-2Z" fill={palette.body} />

        <circle cx="31" cy="34" r="9" fill={palette.face} />
        <circle cx="89" cy="34" r="9" fill={palette.face} />
        <rect x="30" y="12" width="60" height="52" rx="25" fill={palette.face} />

        {variant % 4 === 0 && (
          <path d="M34 27c7-18 43-22 53 0-10-4-16-10-19-16-8 10-19 15-34 16Z" fill={palette.body} />
        )}
        {variant % 4 === 1 && (
          <path d="M47 12c2-8 9-10 13-3 4-7 12-5 14 3" fill="none" stroke={palette.accent} strokeWidth="6" strokeLinecap="round" />
        )}
        {variant % 4 === 2 && (
          <path d="M34 22c5-9 15-13 26-13s21 4 26 13c-12-1-19-5-26-10-7 5-14 9-26 10Z" fill={palette.body} />
        )}
        {variant % 4 === 3 && (
          <>
            <path d="M39 17 31 5M81 17 89 5" stroke={palette.body} strokeWidth="5" strokeLinecap="round" />
            <circle cx="30" cy="5" r="5" fill={palette.accent} />
            <circle cx="90" cy="5" r="5" fill={palette.accent} />
          </>
        )}

        <circle cx="49" cy={eyeY} r="3.4" fill="#35384F" />
        <circle cx="71" cy={eyeY} r="3.4" fill="#35384F" />
        <circle cx="48" cy={eyeY - 1} r="1" fill="#FFFFFF" />
        <circle cx="70" cy={eyeY - 1} r="1" fill="#FFFFFF" />
        <path d="M56 46c2.2 2 5.8 2 8 0" fill="none" stroke="#35384F" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="41" cy="44" r="4" fill={palette.accent} opacity="0.5" />
        <circle cx="79" cy="44" r="4" fill={palette.accent} opacity="0.5" />

        <path d="M42 67h36l-4 22H46l-4-22Z" fill="#F8F8FC" stroke="#DBDEEC" strokeWidth="2" />
        <circle cx="60" cy="77" r="3" fill={palette.body} opacity="0.7" />
      </svg>
    </div>
  );
}
