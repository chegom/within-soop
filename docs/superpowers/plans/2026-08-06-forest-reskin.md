# gyeot 숲 리스킨 1단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** gyeot 데스크탑 앱을 "활발하고 따뜻한 숲" 테마로 리스킨 — 숲 배경 + 동물 캐릭터 6종 + 미지정 시 랜덤/지정 시 고정 선택.

**Architecture:** 기존 컴팩트/풀 모드 구조는 그대로 두고 표면만 교체한다. `DeskCharacter`를 종(species) 레지스트리 기반 `ForestCharacter`로 대체하고, App.css의 `:root` 변수 값을 숲 팔레트로 바꿔 전역 색을 한 번에 전환한다. 배경은 CSS 그라데이션 + 인라인 SVG data URI 레이어.

**Tech Stack:** React 19 + TypeScript + Vite 7, Tauri v2 (Rust 쪽 변경 없음), 인라인 SVG.

**Spec:** `docs/superpowers/specs/2026-08-06-forest-reskin-design.md`

## Global Constraints

- 동물 6종 id는 정확히 `bear`, `rabbit`, `mole`, `bird`, `fox`, `squirrel`
- localStorage 키는 `gyeot:species` (지정 안 했으면 키 자체가 없어야 함)
- 외부 리소스(웹폰트·원격 이미지) 금지 — 전부 인라인
- 기존 기능(세션 감지 표시·이모티콘·말풍선·투명도 슬라이더·창 모드 전환·드래그) 회귀 금지
- CSS 변수 이름은 바꾸지 않는다(값만 교체) — 1440줄 전반 churn 방지
- 검증 명령: `npm run build` (tsc + vite build). 개발 확인은 이미 떠 있는 `tauri dev` 창의 HMR로 본다
- gyeot에는 JS 테스트 러너가 없다. 이번 단계에서 새 테스트 프레임워크를 추가하지 않는다(시각 작업 중심). 로직 검증은 tsc + 실행 확인으로 한다

---

### Task 1: git 저장소 초기화 + 베이스라인 커밋

**Files:**
- Create: `.gitignore`

**Interfaces:**
- Produces: 이후 태스크가 커밋할 수 있는 git 저장소

- [ ] **Step 1: git 초기화 및 .gitignore 작성**

```bash
cd /Users/uhuru/dev/gyeot && git init
```

`.gitignore` 내용:

```gitignore
node_modules/
dist/
output/
src-tauri/target/
src-tauri/gen/
.DS_Store
```

- [ ] **Step 2: 베이스라인 커밋**

```bash
cd /Users/uhuru/dev/gyeot && git add -A && git commit -m "chore: 숲 리스킨 전 베이스라인"
```

Expected: 커밋 성공, `git log --oneline` 에 1개 커밋

---

### Task 2: ForestCharacter 컴포넌트 + 종 레지스트리

**Files:**
- Create: `src/components/ForestCharacter.tsx`

**Interfaces:**
- Produces (Task 3이 사용):
  - `FOREST_SPECIES: readonly ["bear","rabbit","mole","bird","fox","squirrel"]`
  - `type ForestSpecies = (typeof FOREST_SPECIES)[number]`
  - `speciesLabel: Record<ForestSpecies, string>` — 한국어 이름
  - `isForestSpecies(value: string | null): value is ForestSpecies`
  - `pickRandomForestSpecies(): ForestSpecies`
  - `ForestCharacter({ species, active?, emote? })` 컴포넌트
- 루트 래퍼는 기존 CSS를 재사용하기 위해 `desk-character` 클래스를 유지하고
  `forest-character species-<id>` 를 추가한다 (기존 `.desk-character svg` 크기,
  `.is-working` 애니메이션, `.character-emote` 이 그대로 적용됨)

- [ ] **Step 1: 컴포넌트 파일 작성**

`src/components/ForestCharacter.tsx` 전체 내용:

```tsx
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
```

- [ ] **Step 2: 타입 검증**

Run: `cd /Users/uhuru/dev/gyeot && npx tsc --noEmit`
Expected: 오류 0 (아직 아무도 import하지 않으므로 App.tsx 영향 없음)

- [ ] **Step 3: 커밋**

```bash
cd /Users/uhuru/dev/gyeot && git add src/components/ForestCharacter.tsx && git commit -m "feat: 숲 동물 6종 ForestCharacter 컴포넌트 + 종 레지스트리"
```

---

### Task 3: App.tsx 배선 — 동물 교체 + 랜덤/고정 선택

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes (Task 2): `ForestCharacter`, `ForestSpecies`, `FOREST_SPECIES`,
  `speciesLabel`, `isForestSpecies`, `pickRandomForestSpecies`
- Produces (Task 4가 스타일링): `.species-picker`, `.species-option`,
  `.species-option.is-selected` 클래스를 가진 선택 UI 마크업

- [ ] **Step 1: import 및 타입 교체**

`import { DeskCharacter, type CharacterTone } from "./components/DeskCharacter";` 를 다음으로 교체:

```tsx
import {
  FOREST_SPECIES,
  ForestCharacter,
  isForestSpecies,
  pickRandomForestSpecies,
  speciesLabel,
  type ForestSpecies,
} from "./components/ForestCharacter";
```

`RoomMate` 타입에서 `tone: CharacterTone;` 과 `variant: number;` 를 제거하고 `species: ForestSpecies;` 를 추가.

- [ ] **Step 2: previewRoomMates에 species 배정**

각 룸메이트의 `tone`/`variant` 필드를 제거하고 species로 교체 (그 사람이 고른 동물이라는 의미):

- momo → `species: "rabbit"`
- devcat → `species: "fox"`
- june → `species: "bird"`
- bori → `species: "bear"`
- mina → `species: "squirrel"`
- noah → `species: "mole"`

- [ ] **Step 3: 내 species 상태 + 선택 함수 추가**

`App()` 안, 기존 `intro` state 근처에 추가:

```tsx
const [mySpecies, setMySpecies] = useState<ForestSpecies>(() => {
  const saved = localStorage.getItem("gyeot:species");
  return isForestSpecies(saved) ? saved : pickRandomForestSpecies();
});
const [hasPinnedSpecies, setHasPinnedSpecies] = useState(
  () => isForestSpecies(localStorage.getItem("gyeot:species")),
);

const chooseSpecies = (next: ForestSpecies | null) => {
  if (next === null) {
    localStorage.removeItem("gyeot:species");
    setHasPinnedSpecies(false);
    setMySpecies(pickRandomForestSpecies());
    setNotice("실행할 때마다 랜덤 동물로 나와요");
    return;
  }
  localStorage.setItem("gyeot:species", next);
  setHasPinnedSpecies(true);
  setMySpecies(next);
  setNotice(`이제 ${speciesLabel[next]}(으)로 나와요`);
};
```

- [ ] **Step 4: DeskCharacter 사용처 4곳 교체**

1. 컴팩트 내 캐릭터: `<DeskCharacter tone="lilac" variant={0} active={session.active} emote={emote} />` → `<ForestCharacter species={mySpecies} active={session.active} emote={emote} />`
2. 컴팩트 동료 목록: `<DeskCharacter tone={mate.tone} variant={mate.variant} active />` → `<ForestCharacter species={mate.species} active />`
3. 풀 모드 내 자리: `<DeskCharacter tone="lilac" variant={0} active={session.active} emote={emote} />` → `<ForestCharacter species={mySpecies} active={session.active} emote={emote} />`
4. 풀 모드 룸메이트 자리: `<DeskCharacter tone={mate.tone} variant={mate.variant} active />` → `<ForestCharacter species={mate.species} active />`

- [ ] **Step 5: 내 소개 다이얼로그에 동물 선택 줄 추가**

`intro-dialog` 안, `<input ...>` 위에 추가:

```tsx
<div className="species-picker" role="radiogroup" aria-label="내 동물 고르기">
  {FOREST_SPECIES.map((item) => (
    <button
      type="button"
      key={item}
      role="radio"
      aria-checked={hasPinnedSpecies && mySpecies === item}
      className={`species-option ${hasPinnedSpecies && mySpecies === item ? "is-selected" : ""}`}
      onClick={() => chooseSpecies(item)}
      title={speciesLabel[item]}
    >
      <ForestCharacter species={item} active />
      <span>{speciesLabel[item]}</span>
    </button>
  ))}
  <button
    type="button"
    role="radio"
    aria-checked={!hasPinnedSpecies}
    className={`species-option ${!hasPinnedSpecies ? "is-selected" : ""}`}
    onClick={() => chooseSpecies(null)}
  >
    <span className="species-random">🎲</span>
    <span>랜덤</span>
  </button>
</div>
```

- [ ] **Step 6: 빌드 및 실행 확인**

Run: `cd /Users/uhuru/dev/gyeot && npm run build`
Expected: tsc·vite 모두 성공 (DeskCharacter는 아직 파일만 남아있고 미사용)

떠 있는 tauri dev 창(HMR)에서 확인:
- 컴팩트/풀 모드 모두 동물 캐릭터로 보임
- "내 소개" 다이얼로그에 동물 7개 버튼(6종+랜덤) 표시
- 동물 클릭 → 내 캐릭터 즉시 변경, 앱 재시작 후에도 유지
- 랜덤 클릭 → localStorage에서 `gyeot:species` 제거 확인 (재시작마다 바뀔 수 있음)

- [ ] **Step 7: 커밋**

```bash
cd /Users/uhuru/dev/gyeot && git add src/App.tsx && git commit -m "feat: 동물 캐릭터 배선 - 미지정 랜덤/지정 고정 + 룸메이트 종 표시"
```

---

### Task 4: App.css 숲 팔레트 + 배경 + 선택 UI 스타일

**Files:**
- Modify: `src/App.css` (`:root` 1-17행, `.app-shell` 52-71행, `.compact-widget` 722-752행, focus-visible 46-49행, 파일 끝에 신규 클래스 추가)

**Interfaces:**
- Consumes (Task 3): `.species-picker`, `.species-option`, `.is-selected` 마크업
- 변수 이름은 유지하고 값만 바꾼다 — 나머지 1400줄이 변수로 색을 받아 자동 전환됨

- [ ] **Step 1: `:root` 변수를 숲 팔레트로 교체**

```css
:root {
  font-family: "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", sans-serif;
  color: #3a4031;
  background: #f3ecd2;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  --room-blue: #f3ecd2; /* 햇살 크림 (이름 유지, 값만 숲으로) */
  --paper: #fdfaf0;
  --ink: #3a4031;
  --muted: #7d8168;
  --line: #e2dcc0;
  --lilac: #5e9c5b; /* 주 액센트 = 잎 초록 */
  --mint: #6fae62;
  --coral: #f0a848; /* 따뜻한 앰버 */
  --desk: #8a6242; /* 나무 그루터기 */
}
```

- [ ] **Step 2: focus 링을 초록으로**

```css
button:focus-visible,
input:focus-visible {
  outline: 3px solid rgba(94, 156, 91, 0.4);
  outline-offset: 3px;
}
```

- [ ] **Step 3: 풀 모드 숲 배경 레이어**

`.app-shell` 배경 교체 (하늘 햇살 → 뒤 나무선 → 앞 나무선 → 땅):

```css
.app-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at 18% 8%, rgba(255, 236, 170, 0.75), transparent 30%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 120' preserveAspectRatio='none'%3E%3Cpath d='M0 120V70C20 55 32 38 48 38S72 60 92 58 122 30 142 32s28 24 48 24 30-28 50-28 26 22 46 22 32-24 46-22 36 20 44 26 20 10 24 10v58Z' fill='%23a8d98a' opacity='0.55'/%3E%3C/svg%3E") bottom / 100% 46% no-repeat,
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 100' preserveAspectRatio='none'%3E%3Cpath d='M0 100V55c24-8 34-30 54-30s26 22 46 22 28-30 48-30 30 26 50 26 24-20 44-20 30 24 50 24 32-18 48-14 40 14 60 22v45Z' fill='%235e9c5b' opacity='0.5'/%3E%3C/svg%3E") bottom / 100% 32% no-repeat,
    linear-gradient(180deg, #fdf6dc 0%, #f3ecd2 46%, #e5dfbe 72%, #d9c9a4 100%);
  position: relative;
  overflow: hidden;
}
```

`.app-shell::before` 도트 톤 교체:

```css
.app-shell::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.3;
  background-image: radial-gradient(rgba(94, 110, 70, 0.16) 0.55px, transparent 0.55px);
  background-size: 9px 9px;
}
```

- [ ] **Step 4: 컴팩트 위젯 숲 배경**

`.compact-widget` 의 `background`·`border`·`box-shadow` 만 교체 (레이아웃 속성 유지):

```css
  background:
    radial-gradient(circle at 8% 0%, rgba(255, 244, 200, 0.95), transparent 40%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 60' preserveAspectRatio='none'%3E%3Cpath d='M0 60V38c18-6 26-20 40-20s20 14 34 14 22-18 36-18 22 14 36 14 20-12 34-12 24 14 38 16 42 4 82 2v26Z' fill='%23a8d98a' opacity='0.45'/%3E%3C/svg%3E") bottom / 100% 55% no-repeat,
    linear-gradient(180deg, #fdf6dc, #f0e8c8);
  border: 1px solid rgba(110, 96, 60, 0.2);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 18px 45px rgba(84, 74, 40, 0.18);
```

`.compact-widget::before` 도트 톤 교체:

```css
  background-image: radial-gradient(rgba(94, 110, 70, 0.17) 0.5px, transparent 0.5px);
```

- [ ] **Step 5: 동물 선택 UI 스타일 (파일 끝에 추가)**

```css
.species-picker {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 14px 0 4px;
}

.species-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px 6px;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
  cursor: pointer;
  font-size: 12px;
  color: var(--muted);
}

.species-option .desk-character svg {
  width: 44px;
  height: auto;
}

.species-option:hover {
  border-color: var(--mint);
}

.species-option.is-selected {
  border-color: var(--lilac);
  background: rgba(94, 156, 91, 0.12);
  color: var(--ink);
  font-weight: 700;
}

.species-random {
  font-size: 26px;
  line-height: 1.35;
}
```

- [ ] **Step 6: 빌드 + 시각 확인**

Run: `cd /Users/uhuru/dev/gyeot && npm run build`
Expected: 성공

tauri dev 창에서 확인:
- 풀 모드: 크림 하늘 + 2겹 나무선 + 흙색 바닥, 텍스트 가독성 유지
- 컴팩트: 따뜻한 숲 그라데이션, 툴 표시등·투명도 슬라이더 잘 보임
- 다이얼로그의 동물 선택 그리드 정렬·선택 하이라이트 확인

- [ ] **Step 7: 커밋**

```bash
cd /Users/uhuru/dev/gyeot && git add src/App.css && git commit -m "feat: 활발하고 따뜻한 숲 팔레트·배경·동물 선택 UI 스타일"
```

---

### Task 5: DeskCharacter 제거 + 최종 검증

**Files:**
- Delete: `src/components/DeskCharacter.tsx`

**Interfaces:**
- Consumes: Task 3에서 모든 사용처가 ForestCharacter로 교체 완료된 상태

- [ ] **Step 1: 미사용 확인 후 삭제**

Run: `cd /Users/uhuru/dev/gyeot && grep -rn "DeskCharacter" src/ --include="*.tsx" --include="*.ts" | grep -v ForestCharacter`
Expected: `src/components/DeskCharacter.tsx` 자신뿐 (import 없음)

```bash
rm /Users/uhuru/dev/gyeot/src/components/DeskCharacter.tsx
```

- [ ] **Step 2: 전체 빌드 + Rust 테스트 회귀 확인**

Run: `cd /Users/uhuru/dev/gyeot && npm run build && cd src-tauri && cargo test`
Expected: 빌드 성공, cargo test 7개 통과 (이번 변경과 무관하게 유지)

- [ ] **Step 3: 최종 시각 검증 (tauri dev 창)**

- 컴팩트 ↔ 풀 전환 정상
- 세션 감지 표시등(Claude 켜짐) 정상
- 이모티콘·말풍선·투명도 정상
- 앱 재시작(dev 재시작) 후: 지정 동물이면 유지, 미지정이면 랜덤

- [ ] **Step 4: 커밋**

```bash
cd /Users/uhuru/dev/gyeot && git add -A && git commit -m "chore: DeskCharacter 제거 - ForestCharacter로 교체 완료"
```
