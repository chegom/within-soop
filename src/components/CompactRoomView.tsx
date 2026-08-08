import { useState, type MouseEventHandler } from "react";
import type { AiSessionSnapshot } from "../native/useAiSession";
import { INTRO_MAX_LENGTH, ROOM_EMOTES } from "../room/constants";
import { isMemberOnline } from "../room/state";
import type {
  RoomConnectionState,
  RoomEmote,
  RoomMember,
} from "../room/types";
import { ForestCharacter } from "./ForestCharacter";
import { Icon } from "./Icon";
import { connectionLabel, remoteStatus } from "./roomLabels";

type CompactRoomViewProps = {
  session: AiSessionSnapshot;
  sessionDuration: string;
  selfMember: RoomMember;
  peers: RoomMember[];
  roomEmotes: Record<string, RoomEmote>;
  profileIntro: string;
  now: number;
  roomMemberCount: number;
  connection: RoomConnectionState;
  compactOpacity: number;
  usesNativeCompactOpacity: boolean;
  notice: string | null;
  onExpand: () => void;
  onClose: () => void;
  onDrag: MouseEventHandler<HTMLElement>;
  onOpacityChange: (value: number) => void;
  onSendEmote: (value: string) => Promise<void>;
  onSaveIntro: (value: string) => void;
};

export function CompactRoomView({
  session,
  sessionDuration,
  selfMember,
  peers,
  roomEmotes,
  profileIntro,
  now,
  roomMemberCount,
  connection,
  compactOpacity,
  usesNativeCompactOpacity,
  notice,
  onExpand,
  onClose,
  onDrag,
  onOpacityChange,
  onSendEmote,
  onSaveIntro,
}: CompactRoomViewProps) {
  const [showEmotes, setShowEmotes] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [draftIntro, setDraftIntro] = useState(profileIntro);

  const openIntro = () => {
    setDraftIntro(profileIntro);
    setShowIntro(true);
  };

  const saveIntro = () => {
    onSaveIntro(draftIntro);
    setShowIntro(false);
  };

  return (
    <div
      className="compact-widget"
      style={{ opacity: usesNativeCompactOpacity ? 1 : compactOpacity / 100 }}
      onMouseDown={onDrag}
      onClick={() => setShowEmotes(false)}
      onContextMenu={(event) => event.preventDefault()}
    >
      <header className="compact-header" data-tauri-drag-region>
        <div className="compact-grab" data-tauri-drag-region>
          <span className="grip-dots" data-tauri-drag-region aria-hidden="true">
            <i /><i /><i /><i /><i /><i />
          </span>
          <span className="compact-logo" data-tauri-drag-region>곁</span>
          <span
            className={`compact-live ${session.active ? "is-active" : ""}`}
            data-tauri-drag-region
          >
            <i /> {session.active ? "함께 작업 중" : "자리 비움"}
          </span>
        </div>
        <div className="compact-controls">
          <button type="button" onClick={onExpand} aria-label="큰 화면으로 보기">
            <Icon name="expand" />
          </button>
          <button type="button" onClick={onClose} aria-label="곁 닫기">
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
              setShowEmotes(true);
            }}
            aria-label="이모티콘 메뉴 열기"
          >
            <ForestCharacter
              species={selfMember.species}
              active={session.active}
              emote={roomEmotes[selfMember.userId]?.value}
            />
          </button>
          <button
            type="button"
            className="compact-intro-bubble"
            onClick={(event) => {
              event.stopPropagation();
              openIntro();
            }}
            title="말풍선 고치기"
          >
            “{profileIntro}”
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
                  <ForestCharacter
                    species={member.species}
                    active={online && member.active}
                    emote={roomEmotes[member.userId]?.value}
                  />
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
          <span className="compact-room-count">
            <Icon name="users" /> 파티원 {roomMemberCount}명
          </span>
          <span className="compact-global-presence">{connectionLabel(connection)}</span>
        </div>
        <input
          className="compact-opacity-slider"
          type="range"
          min="5"
          max="100"
          step="5"
          value={compactOpacity}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onOpacityChange(Number(event.target.value))}
          aria-label="작은 창 투명도"
        />
      </footer>

      {showEmotes && (
        <div className="compact-emote-menu" role="menu" aria-label="이모티콘 보내기">
          {ROOM_EMOTES.map((item) => (
            <button
              type="button"
              key={item}
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                void onSendEmote(item);
                setShowEmotes(false);
              }}
              aria-label={`${item} 이모티콘 띄우기`}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {showIntro && (
        <div className="compact-intro-editor" onClick={(event) => event.stopPropagation()}>
          <span>내 말풍선</span>
          <input
            value={draftIntro}
            onChange={(event) => setDraftIntro(event.target.value.slice(0, INTRO_MAX_LENGTH))}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveIntro();
              if (event.key === "Escape") setShowIntro(false);
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
