import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DeskCharacter, type CharacterTone } from "./components/DeskCharacter";
import "./App.css";

type AiSessionSnapshot = {
  active: boolean;
  tools: string[];
  startedAt: number | null;
};

type RoomMate = {
  id: string;
  name: string;
  intro: string;
  status: string;
  tool: string;
  minutes: number;
  tone: CharacterTone;
  variant: number;
};

type ViewMode = "full" | "compact";
type AiTool = "Codex" | "Claude Code";

// The compact header uses the supplied app marks directly. Keeping them local
// makes the widget work without downloading a logo at runtime.
const toolLogoSource: Record<AiTool, string> = {
  Codex:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAcCAIAAACPoCp1AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAHAAAAADIVzd0AAADQElEQVRIDe2Wvy9zURjHXVo/+kNV/QwGgg5tgsFf0EE6i7B1amw2jKwiEYnJSmKyWUTSxNCBRZB2kAgNUVo/qvf2lmq174fjvZG84t5KbO8d6txznuf7Pc/z/Z5zSaVSqeI3n8rfBH/D/k+g2+Ffb5FJdwtfBhSLxXw+//r6yqrJZDKbzZIkfRlZNkEul0un04VCAdw3REkqFYsw1dTUOByOj8lPVJLxc0Dkw8PDcy7X4HBYrdZPIBUUlMlkZFmuf38+LxklAD2RTJpNpsbGRrpBBbFYjEF3d3dl5YeQ0Nze3tIuYjQOowT39/d0w/WeGY/H19fX2TIolOLxeADlt6uri5mbmxsm7Xa74DDkoudnGpMT6GxzbW2tr69vamqqp6cnGo2mUilat7S0tLe3B2hzczO9EvrzaogAVZ1OJ9GKoiwvL7PHoaGhlZWV6urq2dnZurq6/v7+QCCwtbUFdFVVlcVqZSAq0HcRe+EB5eXlZXV1lda73e7z8/OmpiaXywVfb2/v0dGRxWJBGDqJzHabDTEEgX4FNIedEn1yckIpk5OTYCHs7u7u8fExDYF7fHzc6/Umk8lEIkEkZhVGYKxPwPbFIVJV1WazIeDl5SVAPp9venp6fn7+7OxsYWGBzgSDwVAo9PT0BC6uQy1DBASJB0lJRgYU3tzcZABKNpttaWmhgkgkQgBqU+XfjLe/+hVQr9gLQAMDA7gFm8/NzZE8MzOzuLiIkVpbW5Hk6uoKSjomCKiJgb7I3AEYUeQA1NnZyWZxJJpjf7/fHw6HWb2+vt7f3+eVCyNfKDBjlAA9KYJWoG1HRwfVjI6O4hYkAYumN7w/+Ir5kZERoBVZJljsydBJxkggtre3o/b29vbOzs7w8DB+PTg4QNjBwcGNjY22traJiQlA2T5mIlhcIYYISKNL2BxTMr64uDg9PcVdh4eHWJNWcE+MjY3V1taiAb2ipPIqEMVydshHTO1245MAAadEEPN6d3cHNK0TKfwarUAkPD4+ZlS13m7nNAgNxTzFyYqSVVVuFJY09LIJSAALp6OKqIN/qviSCXdySWjFaRzlVaClMaAh4nxQyr8fMi3y5wQaxPcD/ZP8fb7u6h8LGMCKQ5DZeQAAAABJRU5ErkJggg==",
  "Claude Code":
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAATCAIAAAB+9pigAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAIKADAAQAAAABAAAAEwAAAABKB6ClAAADnUlEQVQ4EYVUz28bRRidb2Znd53YjtLYVkQaJaKiSlEvPaQQkABVAVGEAFGVW2+99MaFG/8DHLly49JzpR4qDrQlzQEqUCNsgpLKcdNsTeQGx87u/ODNbh0b1w6fLHs8P977vve9Gdr64zf2v0GGMUOMhAwFaTKesdYKnmhjtSaL1bHhTU0Vxy5mC2TxK0gcduPba48OEutxCwKmzdvnF8+cLicabG7PyKD93e1swTKLHEdsIi14cG+9ur5RW1yc84WPPQ6RWH03KoT8k0vL+dBXxnEMgrgx4phgBHQ6JQS/9/DP7b3W5ZXXp6eKgqcVMUbEDtqd36tb1ceNK++tyEAyq18G4SktmEdEloJW+s6DR++cnSnYdqe5cxDV/4nq7ah+sFcXnb+XXy1tPTms1fekh6JewGSD7NsDcKaLg/uPRJaTUCb+7ubanfXNL+K1pvRIJYoEMXSVODOGe1LYqFb5erP57Y1Li/MVo8CB2npSEzmCkQH9BFG7Y374aXOC6btb0d3a0y/fXJj1SaeZkhDfP9xNsK186pdq8/5GtHRmoa06PewM1fYJ+rTZEvFkf2e/tiHVkbETeV++Ugx8D5mjVA4US7Y44XPizywZybuNjXbNY/NLLO02MBygZX2CoTqIy7jxOPjx5seV+fWIXyjnV2cDGN9p4NzCmGZXz5Ykp28aRx/MdJcb1cMHUeH0knH6uHWn+QkSQehYSM8z16afXi3ykMWxEr1+OQ6E1tpoe720k1S8gu7GUjrzug65yCoYb1Mic/hcNZ9Ywbr3b8XbfwkukBiUwQfnuXEOxI2gMJdbveLl8jYs+jNzxwRulY2XCCf5RDEonILgR7/+DI/jRbAc3gF+KgO64W605ULIudf8YtkaZbQ67iWyQDlje+DYAaAS11GjkSYVZkzrGU0WWABbKd1q8skpgs4qxgarlTVDFw2Cwc0nBlLgEMMk/sK56c9vsCAsLL9fufZV6dPr1s9NvvVR/t3PDHDd2+SkP07/xdjieC+yi9f71//FPJ5MawwTHgoyXBiZ057v3lF3VbhN4gwdZwZB3JgGJBok78MjKauCcxeNEExS+MZlWZ6nJCEvmLy4ykuzOBWsfMjDfOrMERWMd1GPBL3iyJ2hodrjEt7EAIuEVwIdBbBgpHn60jl3DcWJTU73QkRcLwG3uK4nad3AZSxBf/FqEFNgA2U6OQQPF7Vaz7NJSDZOpd6GYYzBI5kpX8Jn/wJNTrax/tviTwAAAABJRU5ErkJggg==",
};

const previewRoomMates: RoomMate[] = [
  {
    id: "momo",
    name: "Momo",
    intro: "오늘도 천천히 만들어요",
    status: "커피 마시는 중",
    tool: "Claude",
    minutes: 23,
    tone: "peach",
    variant: 1,
  },
  {
    id: "devcat",
    name: "DevCat",
    intro: "작은 걸 오래 만드는 중",
    status: "AI 작업 중",
    tool: "Codex",
    minutes: 72,
    tone: "mint",
    variant: 2,
  },
  {
    id: "june",
    name: "June",
    intro: "오늘의 한 줄부터",
    status: "책 보는 중",
    tool: "Codex",
    minutes: 8,
    tone: "lemon",
    variant: 3,
  },
  {
    id: "bori",
    name: "Bori",
    intro: "조용히 몰입하고 있어요",
    status: "쉬는 중",
    tool: "Claude",
    minutes: 124,
    tone: "lilac",
    variant: 0,
  },
  {
    id: "mina",
    name: "Mina",
    intro: "좋은 흐름을 기다리는 중",
    status: "산책 중",
    tool: "Claude",
    minutes: 35,
    tone: "sky",
    variant: 2,
  },
  {
    id: "noah",
    name: "Noah",
    intro: "하나씩 고치는 중",
    status: "AI 작업 중",
    tool: "Codex",
    minutes: 17,
    tone: "rose",
    variant: 1,
  },
];

const emotes = ["👋", "☕", "🔥", "✨"];
const globalCompanionCount = 312;

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}시간 ${minutes}분째` : `${hours}시간째`;
  }

  if (minutes > 0) {
    return `${minutes}분째`;
  }

  return "방금 시작";
}

type IconName = "edit" | "users" | "spark" | "collapse" | "expand" | "close";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    edit: <path d="M4 16v4h4L19 9l-4-4L4 16Zm12-9 2 2" />,
    users: (
      <>
        <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 20v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    spark: (
      <path d="m12 3 1.25 4.75L18 9l-4.75 1.25L12 15l-1.25-4.75L6 9l4.75-1.25L12 3Zm7 12 .75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15Z" />
    ),
    collapse: (
      <>
        <path d="M8 3v5H3M16 21v-5h5" />
        <path d="m3 8 6-6M21 16l-6 6" />
      </>
    ),
    expand: (
      <>
        <path d="M8 3H3v5M16 21h5v-5" />
        <path d="m3 3 6 6M21 21l-6-6" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function AiToolMark({ tool, active }: { tool: AiTool; active: boolean }) {
  return (
    <span
      className={`compact-tool-signal ${tool === "Codex" ? "is-codex" : "is-claude"} ${active ? "is-active" : "is-idle"}`}
      data-tooltip={tool}
      aria-label={active ? `${tool} 세션 감지됨` : `${tool} 세션 대기 중`}
    >
      <span className="compact-tool-logo-frame">
        <img className="compact-tool-logo" src={toolLogoSource[tool]} alt="" />
        <i className="compact-tool-status-dot" aria-hidden="true" />
      </span>
    </span>
  );
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    localStorage.getItem("gyeot:view-mode") === "compact" ? "compact" : "full",
  );
  const [session, setSession] = useState<AiSessionSnapshot>({
    active: false,
    tools: [],
    startedAt: null,
  });
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [emote, setEmote] = useState<string | null>(null);
  const [showCompactEmotes, setShowCompactEmotes] = useState(false);
  const [showCompactIntro, setShowCompactIntro] = useState(false);
  const [usesNativeCompactOpacity, setUsesNativeCompactOpacity] = useState(false);
  const [compactOpacity, setCompactOpacity] = useState(() => {
    const saved = Number(localStorage.getItem("gyeot:compact-opacity") ?? "70");
    return Number.isFinite(saved) ? Math.min(100, Math.max(5, saved)) : 70;
  });
  const [intro, setIntro] = useState(
    () => localStorage.getItem("gyeot:intro") ?? "조용히 무언가를 만드는 중",
  );
  const [draftIntro, setDraftIntro] = useState(intro);
  const [isEditingIntro, setIsEditingIntro] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const isTauri = "__TAURI_INTERNALS__" in window;
    document.documentElement.dataset.viewMode = viewMode;
    localStorage.setItem("gyeot:view-mode", viewMode);

    if (isTauri) {
      void invoke("set_window_mode", { compact: viewMode === "compact" }).catch(() => {
        setNotice("창 크기를 바꾸지 못했어요");
      });
    }
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem("gyeot:compact-opacity", String(compactOpacity));
  }, [compactOpacity]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) {
      setUsesNativeCompactOpacity(false);
      return;
    }

    const opacity = viewMode === "compact" ? compactOpacity / 100 : 1;
    void invoke<boolean>("set_window_opacity", { opacity })
      .then(setUsesNativeCompactOpacity)
      .catch(() => {
        setUsesNativeCompactOpacity(false);
        setNotice("투명도를 적용하지 못했어요");
      });
  }, [compactOpacity, viewMode]);

  useEffect(() => {
    let cancelled = false;
    const isTauri = "__TAURI_INTERNALS__" in window;

    const detectSession = async () => {
      if (!isTauri) {
        if (!cancelled) {
          setSession({
            active: true,
            tools: ["Codex"],
            startedAt: Math.floor(Date.now() / 1000) - 48 * 60,
          });
        }
        return;
      }

      try {
        const nextSession = await invoke<AiSessionSnapshot>("detect_ai_session");
        if (!cancelled) setSession(nextSession);
      } catch {
        if (!cancelled) setNotice("세션 감지를 다시 시도하고 있어요");
      }
    };

    void detectSession();
    const detector = window.setInterval(detectSession, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(detector);
    };
  }, []);

  useEffect(() => {
    if (!emote) return;
    const timer = window.setTimeout(() => setEmote(null), 2400);
    return () => window.clearTimeout(timer);
  }, [emote]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const sessionDuration = useMemo(() => {
    if (!session.active || !session.startedAt) return "AI 세션 기다리는 중";
    return formatDuration(now - session.startedAt);
  }, [now, session.active, session.startedAt]);

  const activeTool = session.tools.length > 0 ? session.tools.join(" + ") : "자리 비움";

  const seats = useMemo(
    () => [
      { type: "mate" as const, data: previewRoomMates[0] },
      { type: "mate" as const, data: previewRoomMates[1] },
      { type: "self" as const },
      { type: "mate" as const, data: previewRoomMates[2] },
      { type: "mate" as const, data: previewRoomMates[3] },
      { type: "mate" as const, data: previewRoomMates[4] },
      { type: "empty" as const },
      { type: "mate" as const, data: previewRoomMates[5] },
      { type: "empty" as const },
      { type: "empty" as const },
    ],
    [],
  );

  const saveIntro = () => {
    const trimmed = draftIntro.trim() || "조용히 무언가를 만드는 중";
    setIntro(trimmed);
    setDraftIntro(trimmed);
    localStorage.setItem("gyeot:intro", trimmed);
    setIsEditingIntro(false);
    setShowCompactIntro(false);
    setNotice("소개를 바꿨어요");
  };

  const showCompact = () => {
    setIsEditingIntro(false);
    setViewMode("compact");
  };

  const closeWindow = () => {
    if ("__TAURI_INTERNALS__" in window) {
      void invoke("close_window");
    } else {
      setNotice("앱에서는 이 버튼으로 창을 닫을 수 있어요");
    }
  };

  const beginCompactDrag = (event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, input")) return;
    if ("__TAURI_INTERNALS__" in window) {
      event.preventDefault();
      void invoke("start_window_drag");
    }
  };

  if (viewMode === "compact") {
    return (
      <div
        className="compact-widget"
        style={{ opacity: usesNativeCompactOpacity ? 1 : compactOpacity / 100 }}
        onMouseDown={beginCompactDrag}
        onClick={() => {
          setShowCompactEmotes(false);
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <header className="compact-header" data-tauri-drag-region>
          <div className="compact-grab" data-tauri-drag-region>
            <span className="grip-dots" data-tauri-drag-region aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="compact-logo" data-tauri-drag-region>곁</span>
            <span className={`compact-live ${session.active ? "is-active" : ""}`} data-tauri-drag-region>
              <i /> {session.active ? "함께 있음" : "세션 기다리는 중"}
            </span>
            <span className="compact-tool-signals compact-header-tools" aria-label="AI 세션 감지 상태">
              <AiToolMark tool="Codex" active={session.tools.includes("Codex")} />
              <AiToolMark tool="Claude Code" active={session.tools.includes("Claude Code")} />
            </span>
          </div>
          <div className="compact-controls">
            <button type="button" onClick={() => setViewMode("full")} aria-label="큰 화면으로 보기">
              <Icon name="expand" />
            </button>
            <button type="button" onClick={closeWindow} aria-label="곁 닫기">
              <Icon name="close" />
            </button>
          </div>
        </header>

        <main className="compact-content">
          <div className="compact-self">
            <button
              type="button"
              className="compact-character-button"
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setShowCompactEmotes(true);
              }}
              aria-label="이모티콘 메뉴 열기"
            >
              <DeskCharacter tone="lilac" variant={0} active={session.active} emote={emote} />
            </button>
            <button
              type="button"
              className="compact-intro-bubble"
              onClick={(event) => {
                event.stopPropagation();
                setDraftIntro(intro);
                setShowCompactIntro(true);
              }}
              title="말풍선 고치기"
            >
              “{intro}”
            </button>
          </div>

          <div className="compact-copy">
            <h1>
              {session.active ? sessionDuration : "쉬는 중"}
            </h1>
            <div className="compact-peers" aria-label="함께 작업 중인 동료 미리보기">
              <span className="compact-desk-line" />
              {previewRoomMates.slice(0, 6).map((mate) => (
                <div className="compact-peer" key={mate.id}>
                  <DeskCharacter
                    tone={mate.tone}
                    variant={mate.variant}
                    active
                  />
                  <div className="compact-peer-hover-card">
                    <strong>{mate.name}</strong>
                    <span>{mate.status}</span>
                    <em>“{mate.intro}”</em>
                  </div>
                </div>
              ))}
              {previewRoomMates.length > 6 && (
                <span className="compact-more">+{previewRoomMates.length - 6}</span>
              )}
            </div>
          </div>
        </main>

        <footer className="compact-footer">
          <div className="compact-presence-summary">
            <span className="compact-room-count">
              <Icon name="users" /> 파티원 7명
            </span>
            <span className="compact-global-presence">
              <Icon name="users" /> 지금 함께 {globalCompanionCount}명
            </span>
          </div>
          <input
            className="compact-opacity-slider"
            type="range"
            min="5"
            max="100"
            step="5"
            value={compactOpacity}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => setCompactOpacity(Number(event.target.value))}
            aria-label="작은 창 투명도"
          />
        </footer>

        {showCompactEmotes && (
          <div className="compact-emote-menu" role="menu" aria-label="이모티콘 보내기">
            {emotes.map((item) => (
              <button
                type="button"
                key={item}
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation();
                  setEmote(item);
                  setShowCompactEmotes(false);
                }}
                aria-label={`${item} 이모티콘 띄우기`}
              >
                {item}
              </button>
            ))}
          </div>
        )}

        {showCompactIntro && (
          <div
            className="compact-intro-editor"
            onClick={(event) => event.stopPropagation()}
          >
            <span>내 말풍선</span>
            <input
              value={draftIntro}
              onChange={(event) => setDraftIntro(event.target.value.slice(0, 28))}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveIntro();
                if (event.key === "Escape") setShowCompactIntro(false);
              }}
              autoFocus
              aria-label="작은 창 말풍선"
            />
            <button type="button" onClick={saveIntro}>저장</button>
          </div>
        )}

        {notice && (
          <div className="compact-toast" role="status" aria-live="polite">
            {notice}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="window-header" data-tauri-drag-region>
        <div className="brand" data-tauri-drag-region>
          <span className="brand-mark">곁</span>
          <div data-tauri-drag-region>
            <strong>곁</strong>
            <span>혼자여도, 같은 방에서.</span>
          </div>
        </div>

        <div className="window-header-actions">
          <div className={`local-status ${session.active ? "is-active" : ""}`}>
            <span className="status-dot" />
            {session.active ? `${activeTool} 감지됨` : "로컬 세션 대기 중"}
          </div>
          <button type="button" className="compact-mode-button" onClick={showCompact}>
            <Icon name="collapse" /> 작게 띄우기
          </button>
        </div>
      </header>

      <main className="main-content">
        <section className="room-heading" aria-labelledby="room-title">
          <div>
            <span className="eyebrow">조용한 작업실</span>
            <h1 id="room-title">누군가와 나란히 만드는 시간</h1>
          </div>
          <div className="room-meta">
            <span className="preview-pill">
              <Icon name="spark" /> 프로토타입 방
            </span>
            <span className="seat-count">
              <Icon name="users" /> 7 / 10
            </span>
          </div>
        </section>

        <section className="shared-room" aria-label="최대 열 명의 작업 파티 미리보기">
          <div className="room-note">
            온라인 연결 전에는 함께할 방의 모습을 미리 보여주고 있어요.
          </div>

          <div className="desk-grid">
            {[seats.slice(0, 5), seats.slice(5, 10)].map((row, rowIndex) => (
              <div className="desk-row" key={rowIndex}>
                {row.map((seat, seatIndex) => {
                  const key = `${rowIndex}-${seatIndex}`;

                  if (seat.type === "empty") {
                    return (
                      <div className="seat empty-seat" key={key} aria-label="빈 자리">
                        <div className="empty-chair">+</div>
                        <span>빈 자리</span>
                      </div>
                    );
                  }

                  if (seat.type === "self") {
                    return (
                      <button
                        type="button"
                        className={`seat self-seat ${session.active ? "is-active" : "is-away"}`}
                        key={key}
                        onClick={() => setIsEditingIntro(true)}
                        aria-label="내 소개 수정"
                      >
                        <DeskCharacter
                          tone="lilac"
                          variant={0}
                          active={session.active}
                          emote={emote}
                        />
                        <strong>나</strong>
                        <span className="seat-detail">
                          {session.active ? `${activeTool} · ${sessionDuration}` : "세션을 시작하면 앉아요"}
                        </span>
                        <span className="you-label">MY SEAT</span>
                      </button>
                    );
                  }

                  const mate = seat.data;
                  return (
                    <button
                      type="button"
                      className="seat mate-seat"
                      key={key}
                      title={mate.intro}
                      onClick={() => setNotice(`${mate.name} · “${mate.intro}”`)}
                    >
                      <DeskCharacter tone={mate.tone} variant={mate.variant} active />
                      <strong>{mate.name}</strong>
                      <span className="seat-detail">
                        {mate.status} · {formatDuration(mate.minutes * 60)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <footer className="session-bar">
          <button type="button" className="intro-button" onClick={() => setIsEditingIntro(true)}>
            <span className="intro-avatar">나</span>
            <span>
              <small>한 줄 소개</small>
              <strong>“{intro}”</strong>
            </span>
            <Icon name="edit" />
          </button>

          <div className="emote-picker" aria-label="이모티콘 보내기">
            <span>가볍게 인사하기</span>
            <div>
              {emotes.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setEmote(item)}
                  aria-label={`${item} 이모티콘 띄우기`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </footer>
      </main>

      {isEditingIntro && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setIsEditingIntro(false)}>
          <section
            className="intro-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="intro-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="eyebrow">내 자리</span>
            <h2 id="intro-dialog-title">짧게 나를 소개해요</h2>
            <p>함께 있는 사람에게 이 한 줄만 보여요.</p>
            <input
              value={draftIntro}
              onChange={(event) => setDraftIntro(event.target.value.slice(0, 28))}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveIntro();
                if (event.key === "Escape") setIsEditingIntro(false);
              }}
              autoFocus
              aria-label="한 줄 소개"
            />
            <div className="character-count">{draftIntro.length} / 28</div>
            <div className="dialog-actions">
              <button type="button" className="ghost-button" onClick={() => setIsEditingIntro(false)}>
                취소
              </button>
              <button type="button" className="primary-button" onClick={saveIntro}>
                소개 바꾸기
              </button>
            </div>
          </section>
        </div>
      )}

      {notice && (
        <div className="toast" role="status" aria-live="polite">
          {notice}
        </div>
      )}
    </div>
  );
}

export default App;
