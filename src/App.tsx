import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  FOREST_SPECIES,
  ForestCharacter,
  isForestSpecies,
  speciesLabel,
  type ForestSpecies,
} from "./components/ForestCharacter";
import { RoomSetup } from "./components/RoomSetup";
import { createRoomClient, type RoomSessionSnapshot } from "./room/client";
import { inviteUrl } from "./room/invite";
import {
  createGuestProfile,
  normalizeDisplayName,
  normalizeIntro,
  pickRecommendedSpecies,
} from "./room/profile";
import { buildSeats, isMemberOnline } from "./room/state";
import type { GuestProfile, RoomMember } from "./room/types";
import { useRoom } from "./room/useRoom";
import "./App.css";

type AiSessionSnapshot = {
  active: boolean;
  tools: string[];
  startedAt: number | null;
};

type ViewMode = "full" | "compact";
type IconName = "edit" | "users" | "collapse" | "expand" | "close" | "copy";

const emotes = ["👋", "☕", "🔥", "✨"];

function loadGuestProfile(): GuestProfile {
  const savedSpecies = localStorage.getItem("gyeot:species");
  const savedName = localStorage.getItem("gyeot:display-name");
  const savedIntro = localStorage.getItem("gyeot:intro");

  if (savedName && isForestSpecies(savedSpecies)) {
    return {
      displayName: normalizeDisplayName(savedName),
      species: savedSpecies,
      intro: normalizeIntro(savedIntro ?? ""),
    };
  }

  const recommendation = createGuestProfile(Math.random);
  localStorage.setItem("gyeot:display-name", recommendation.displayName);
  localStorage.setItem("gyeot:species", recommendation.species);
  localStorage.setItem("gyeot:intro", recommendation.intro);
  return recommendation;
}

function storeGuestProfile(profile: GuestProfile) {
  localStorage.setItem("gyeot:display-name", profile.displayName);
  localStorage.setItem("gyeot:species", profile.species);
  localStorage.setItem("gyeot:intro", profile.intro);
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}시간 ${minutes}분째` : `${hours}시간째`;
  if (minutes > 0) return `${minutes}분째`;
  return "방금 시작";
}

function remoteStatus(member: RoomMember, now: number) {
  if (!isMemberOnline(member, now)) return "연결 끊김";
  return member.active ? "함께 작업 중" : "자리 비움";
}

function connectionLabel(connection: ReturnType<typeof useRoom>["connection"]) {
  if (connection === "connected") return "연결됨";
  if (connection === "reconnecting") return "연결 다시 시도 중";
  if (connection === "connecting") return "연결 중";
  if (connection === "error") return "연결 확인 필요";
  return "연결 설정 필요";
}

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
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>,
  };

  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
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
  const [now, setNow] = useState(Date.now);
  const [profile, setProfile] = useState<GuestProfile>(loadGuestProfile);
  const [draftName, setDraftName] = useState(profile.displayName);
  const [draftIntro, setDraftIntro] = useState(profile.intro);
  const [draftSpecies, setDraftSpecies] = useState<ForestSpecies>(profile.species);
  const [isEditingIntro, setIsEditingIntro] = useState(false);
  const [showCompactEmotes, setShowCompactEmotes] = useState(false);
  const [showCompactIntro, setShowCompactIntro] = useState(false);
  const [usesNativeCompactOpacity, setUsesNativeCompactOpacity] = useState(false);
  const [compactOpacity, setCompactOpacity] = useState(() => {
    const saved = Number(localStorage.getItem("gyeot:compact-opacity") ?? "70");
    return Number.isFinite(saved) ? Math.min(100, Math.max(5, saved)) : 70;
  });
  const [notice, setNotice] = useState<string | null>(null);
  const roomClient = useMemo(() => createRoomClient(), []);
  const roomSession = useMemo<RoomSessionSnapshot>(
    () => ({ active: session.active, startedAt: session.startedAt }),
    [session.active, session.startedAt],
  );
  const room = useRoom({ client: roomClient, profile, session: roomSession });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
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
    const detector = window.setInterval(detectSession, 4_000);
    return () => {
      cancelled = true;
      window.clearInterval(detector);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2_600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const sessionDuration = useMemo(() => {
    if (!session.active || !session.startedAt) return "AI 세션 기다리는 중";
    return formatDuration(Math.floor(now / 1_000) - session.startedAt);
  }, [now, session.active, session.startedAt]);
  const activeTool = session.tools.length > 0 ? session.tools.join(" + ") : "자리 비움";

  const selfMember = useMemo<RoomMember>(() => {
    const ownMember = room.members.find((member) => member.userId === room.userId);
    return ownMember ?? {
      roomId: room.roomId ?? "",
      userId: room.userId ?? "local-member",
      ...profile,
      active: session.active,
      startedAt: session.startedAt ? session.startedAt * 1_000 : null,
      lastSeenAt: now,
    };
  }, [now, profile, room.members, room.roomId, room.userId, session.active, session.startedAt]);
  const peers = useMemo(
    () => room.members.filter((member) => member.userId !== selfMember.userId),
    [room.members, selfMember.userId],
  );
  const seats = useMemo(() => buildSeats(selfMember, peers), [peers, selfMember]);
  const roomMemberCount = room.roomId ? Math.max(1, room.members.length) : 0;

  const persistProfile = (nextProfile: GuestProfile) => {
    setProfile(nextProfile);
    storeGuestProfile(nextProfile);
    if (room.roomId) {
      void room.saveProfile(nextProfile).catch(() => {
        setNotice("소개를 동기화하지 못했어요");
      });
    }
  };

  const saveIntro = () => {
    persistProfile({
      displayName: normalizeDisplayName(draftName),
      species: draftSpecies,
      intro: normalizeIntro(draftIntro),
    });
    setIsEditingIntro(false);
    setShowCompactIntro(false);
    setNotice("소개를 바꿨어요");
  };

  const openIntroEditor = () => {
    setDraftName(profile.displayName);
    setDraftIntro(profile.intro);
    setDraftSpecies(profile.species);
    setIsEditingIntro(true);
  };

  const saveCompactIntro = () => {
    persistProfile({ ...profile, intro: normalizeIntro(draftIntro) });
    setShowCompactIntro(false);
    setNotice("소개를 바꿨어요");
  };

  const createRoom = async () => {
    const nextProfile = {
      ...profile,
      displayName: normalizeDisplayName(profile.displayName),
      intro: normalizeIntro(profile.intro),
    };
    persistProfile(nextProfile);
    await room.createRoom();
    setNotice("작업실을 열었어요");
  };

  const joinRoom = async (token: string) => {
    const nextProfile = {
      ...profile,
      displayName: normalizeDisplayName(profile.displayName),
      intro: normalizeIntro(profile.intro),
    };
    persistProfile(nextProfile);
    await room.joinRoom(token);
    setNotice("작업실에 참여했어요");
  };

  const sendEmote = async (value: string) => {
    try {
      await room.sendEmote(value);
    } catch {
      setNotice("이모티콘을 보내지 못했어요");
    }
  };

  const copyInvite = async () => {
    if (!room.invite) return;
    try {
      await navigator.clipboard.writeText(inviteUrl(room.invite.inviteToken));
      setNotice("초대 링크를 복사했어요");
    } catch {
      setNotice("초대 링크를 복사하지 못했어요");
    }
  };

  const closeWindow = () => {
    if ("__TAURI_INTERNALS__" in window) void invoke("close_window");
    else setNotice("앱에서는 이 버튼으로 창을 닫을 수 있어요");
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

  const updateSetupName = (displayName: string) => {
    const nextProfile = { ...profile, displayName };
    setProfile(nextProfile);
    storeGuestProfile(nextProfile);
  };

  if (viewMode === "compact" && room.roomId) {
    return (
      <div
        className="compact-widget"
        style={{ opacity: usesNativeCompactOpacity ? 1 : compactOpacity / 100 }}
        onMouseDown={beginCompactDrag}
        onClick={() => setShowCompactEmotes(false)}
        onContextMenu={(event) => event.preventDefault()}
      >
        <header className="compact-header" data-tauri-drag-region>
          <div className="compact-grab" data-tauri-drag-region>
            <span className="grip-dots" data-tauri-drag-region aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
            <span className="compact-logo" data-tauri-drag-region>곁</span>
            <span className={`compact-live ${session.active ? "is-active" : ""}`} data-tauri-drag-region>
              <i /> {session.active ? "함께 작업 중" : "자리 비움"}
            </span>
          </div>
          <div className="compact-controls">
            <button type="button" onClick={() => setViewMode("full")} aria-label="큰 화면으로 보기"><Icon name="expand" /></button>
            <button type="button" onClick={closeWindow} aria-label="곁 닫기"><Icon name="close" /></button>
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
              <ForestCharacter species={selfMember.species} active={session.active} emote={room.emotes[selfMember.userId]?.value} />
            </button>
            <button
              type="button"
              className="compact-intro-bubble"
              onClick={(event) => {
                event.stopPropagation();
                setDraftIntro(profile.intro);
                setShowCompactIntro(true);
              }}
              title="말풍선 고치기"
            >
              “{profile.intro}”
            </button>
          </div>
          <div className="compact-copy">
            <h1>{session.active ? sessionDuration : "쉬는 중"}</h1>
            <div className="compact-peers" aria-label="같은 방에 있는 사람">
              <span className="compact-desk-line" />
              {peers.slice(0, 6).map((member) => {
                const online = isMemberOnline(member, now);
                return (
                  <div className="compact-peer" key={member.userId}>
                    <ForestCharacter species={member.species} active={online && member.active} emote={room.emotes[member.userId]?.value} />
                    <div className="compact-peer-hover-card">
                      <strong>{member.displayName}</strong>
                      <span>{remoteStatus(member, now)}</span>
                      <em>“{member.intro}”</em>
                    </div>
                  </div>
                );
              })}
              {peers.length > 6 && <span className="compact-more">+{peers.length - 6}</span>}
            </div>
          </div>
        </main>

        <footer className="compact-footer">
          <div className="compact-presence-summary">
            <span className="compact-room-count"><Icon name="users" /> 파티원 {roomMemberCount}명</span>
            <span className="compact-global-presence">{connectionLabel(room.connection)}</span>
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
                  void sendEmote(item);
                  setShowCompactEmotes(false);
                }}
                aria-label={`${item} 이모티콘 띄우기`}
              >{item}</button>
            ))}
          </div>
        )}

        {showCompactIntro && (
          <div className="compact-intro-editor" onClick={(event) => event.stopPropagation()}>
            <span>내 말풍선</span>
            <input
              value={draftIntro}
              onChange={(event) => setDraftIntro(event.target.value.slice(0, 28))}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveCompactIntro();
                if (event.key === "Escape") setShowCompactIntro(false);
              }}
              autoFocus
              aria-label="작은 창 말풍선"
            />
            <button type="button" onClick={saveCompactIntro}>저장</button>
          </div>
        )}

        {notice && <div className="compact-toast" role="status" aria-live="polite">{notice}</div>}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="window-header" data-tauri-drag-region>
        <div className="brand" data-tauri-drag-region>
          <span className="brand-mark">곁</span>
          <div data-tauri-drag-region><strong>곁</strong><span>혼자여도, 같은 방에서.</span></div>
        </div>
        <div className="window-header-actions">
          <div className={`local-status ${session.active ? "is-active" : ""}`}>
            <span className="status-dot" />
            {session.active ? `${activeTool} 감지됨` : "로컬 세션 대기 중"}
          </div>
          <button type="button" className="compact-mode-button" onClick={() => setViewMode("compact")} disabled={!room.roomId}>
            <Icon name="collapse" /> 작게 띄우기
          </button>
        </div>
      </header>

      <main className="main-content">
        {!room.roomId ? (
          <RoomSetup
            displayName={profile.displayName}
            onDisplayNameChange={updateSetupName}
            onCreate={createRoom}
            onJoin={joinRoom}
            connection={room.connection}
            error={room.error}
          />
        ) : (
          <>
            <section className="room-heading" aria-labelledby="room-title">
              <div>
                <span className="eyebrow">조용한 작업실</span>
                <h1 id="room-title">누군가와 나란히 만드는 시간</h1>
              </div>
              <div className="room-meta">
                <span className="seat-count"><Icon name="users" /> {roomMemberCount} / 10</span>
              </div>
            </section>

            {room.invite && (
              <section className="room-invite" aria-label="방 초대">
                <div><small>초대 코드</small><code>{room.invite.inviteToken}</code></div>
                <button type="button" className="ghost-button" onClick={() => void copyInvite()}><Icon name="copy" /> 초대 링크 복사</button>
              </section>
            )}

            <section className="shared-room" aria-label="최대 열 명의 비공개 작업실">
              <div className="room-note">이 방에 참여한 사람의 소개와 작업 상태만 보여요.</div>
              <div className="desk-grid">
                {[seats.slice(0, 5), seats.slice(5, 10)].map((row, rowIndex) => (
                  <div className="desk-row" key={rowIndex}>
                    {row.map((seat, seatIndex) => {
                      const key = `${rowIndex}-${seatIndex}`;
                      if (seat.type === "empty") {
                        return <div className="seat empty-seat" key={key} aria-label="빈 자리"><div className="empty-chair">+</div><span>빈 자리</span></div>;
                      }
                      if (seat.type === "self") {
                        return (
                          <button type="button" className={`seat self-seat ${session.active ? "is-active" : "is-away"}`} key={key} onClick={openIntroEditor} aria-label="내 소개 수정">
                            <ForestCharacter species={seat.data.species} active={session.active} emote={room.emotes[seat.data.userId]?.value} />
                            <strong>나</strong>
                            <span className="seat-detail">{session.active ? `${activeTool} · ${sessionDuration}` : "세션을 시작하면 앉아요"}</span>
                            <span className="you-label">MY SEAT</span>
                          </button>
                        );
                      }
                      const online = isMemberOnline(seat.data, now);
                      return (
                        <button type="button" className={`seat mate-seat ${online ? "" : "is-offline"}`} key={key} title={seat.data.intro} onClick={() => setNotice(`${seat.data.displayName} · “${seat.data.intro}”`)}>
                          <ForestCharacter species={seat.data.species} active={online && seat.data.active} emote={room.emotes[seat.data.userId]?.value} />
                          <strong>{seat.data.displayName}</strong>
                          <span className="seat-detail">{remoteStatus(seat.data, now)}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>

            <footer className="session-bar">
              <button type="button" className="intro-button" onClick={openIntroEditor}>
                <span className="intro-avatar">나</span>
                <span><small>한 줄 소개</small><strong>“{profile.intro}”</strong></span>
                <Icon name="edit" />
              </button>
              <div className="emote-picker" aria-label="이모티콘 보내기">
                <span>가볍게 인사하기</span>
                <div>{emotes.map((item) => <button type="button" key={item} onClick={() => void sendEmote(item)} aria-label={`${item} 이모티콘 띄우기`}>{item}</button>)}</div>
              </div>
            </footer>
          </>
        )}
      </main>

      {isEditingIntro && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setIsEditingIntro(false)}>
          <section className="intro-dialog" role="dialog" aria-modal="true" aria-labelledby="intro-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <span className="eyebrow">내 자리</span>
            <h2 id="intro-dialog-title">짧게 나를 소개해요</h2>
            <p>표시 이름, 동물 캐릭터, 이 한 줄만 함께 있는 사람에게 보여요.</p>
            <label className="dialog-field"><span>표시 이름</span><input value={draftName} onChange={(event) => setDraftName(event.target.value.slice(0, 24))} aria-label="표시 이름" /></label>
            <div className="species-picker" role="radiogroup" aria-label="내 동물 고르기">
              {FOREST_SPECIES.map((item) => (
                <button type="button" key={item} role="radio" aria-checked={draftSpecies === item} className={`species-option ${draftSpecies === item ? "is-selected" : ""}`} onClick={() => setDraftSpecies(item)} title={speciesLabel[item]}>
                  <ForestCharacter species={item} active /><span>{speciesLabel[item]}</span>
                </button>
              ))}
              <button type="button" role="radio" aria-checked={false} className="species-option" onClick={() => setDraftSpecies(pickRecommendedSpecies(Math.random))}>
                <span className="species-random">🎲</span><span>랜덤 추천</span>
              </button>
            </div>
            <label className="dialog-field"><span>한 줄 소개</span><input value={draftIntro} onChange={(event) => setDraftIntro(event.target.value.slice(0, 28))} onKeyDown={(event) => { if (event.key === "Enter") saveIntro(); if (event.key === "Escape") setIsEditingIntro(false); }} autoFocus aria-label="한 줄 소개" /></label>
            <div className="character-count">{draftIntro.length} / 28</div>
            <div className="dialog-actions"><button type="button" className="ghost-button" onClick={() => setIsEditingIntro(false)}>취소</button><button type="button" className="primary-button" onClick={saveIntro}>소개 바꾸기</button></div>
          </section>
        </div>
      )}

      {notice && <div className="toast" role="status" aria-live="polite">{notice}</div>}
    </div>
  );
}

export default App;
