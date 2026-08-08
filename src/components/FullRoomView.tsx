import type { AiSessionSnapshot } from "../native/useAiSession";
import {
  ROOM_CAPACITY,
  ROOM_EMOTES,
  type ForestSpecies,
} from "../room/constants";
import { isMemberOnline } from "../room/state";
import type { GuestProfile, RoomMember, RoomSeat } from "../room/types";
import type { UseRoomResult } from "../room/useRoom";
import { ForestCharacter } from "./ForestCharacter";
import { Icon } from "./Icon";
import { ProfileDialog } from "./ProfileDialog";
import { RoomSetup } from "./RoomSetup";
import { remoteStatus } from "./roomLabels";

type FullRoomViewProps = {
  session: AiSessionSnapshot;
  activeTool: string;
  sessionDuration: string;
  profile: GuestProfile;
  room: UseRoomResult;
  seats: RoomSeat[];
  now: number;
  roomMemberCount: number;
  notice: string | null;
  isEditingProfile: boolean;
  draftName: string;
  draftIntro: string;
  draftSpecies: ForestSpecies;
  onCompact: () => void;
  onSetupNameChange: (value: string) => void;
  onCreateRoom: () => Promise<void>;
  onJoinRoom: (token: string) => Promise<void>;
  onCopyInvite: () => Promise<void>;
  onSendEmote: (value: string) => Promise<void>;
  onOpenProfile: () => void;
  onCloseProfile: () => void;
  onSaveProfile: () => void;
  onDraftNameChange: (value: string) => void;
  onDraftIntroChange: (value: string) => void;
  onDraftSpeciesChange: (value: ForestSpecies) => void;
  onPeerSelect: (member: RoomMember) => void;
};

export function FullRoomView({
  session,
  activeTool,
  sessionDuration,
  profile,
  room,
  seats,
  now,
  roomMemberCount,
  notice,
  isEditingProfile,
  draftName,
  draftIntro,
  draftSpecies,
  onCompact,
  onSetupNameChange,
  onCreateRoom,
  onJoinRoom,
  onCopyInvite,
  onSendEmote,
  onOpenProfile,
  onCloseProfile,
  onSaveProfile,
  onDraftNameChange,
  onDraftIntroChange,
  onDraftSpeciesChange,
  onPeerSelect,
}: FullRoomViewProps) {
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
          <button
            type="button"
            className="compact-mode-button"
            onClick={onCompact}
            disabled={!room.roomId}
          >
            <Icon name="collapse" /> 작게 띄우기
          </button>
        </div>
      </header>

      <main className="main-content">
        {!room.roomId ? (
          <RoomSetup
            displayName={profile.displayName}
            onDisplayNameChange={onSetupNameChange}
            onCreate={onCreateRoom}
            onJoin={onJoinRoom}
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
                <span className="seat-count">
                  <Icon name="users" /> {roomMemberCount} / {ROOM_CAPACITY}
                </span>
                <button
                  type="button"
                  className="ghost-button room-leave-button"
                  onClick={room.leaveRoom}
                >
                  작업실 나가기
                </button>
              </div>
            </section>

            {room.invite && (
              <section className="room-invite" aria-label="방 초대">
                <div>
                  <small>초대 코드</small>
                  <code>{room.invite.inviteToken}</code>
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => void onCopyInvite()}
                >
                  <Icon name="copy" /> 초대 링크 복사
                </button>
              </section>
            )}

            <section className="shared-room" aria-label="최대 열 명의 비공개 작업실">
              <div className="room-note">이 방에 참여한 사람의 소개와 작업 상태만 보여요.</div>
              <div className="desk-grid">
                {[
                  seats.slice(0, ROOM_CAPACITY / 2),
                  seats.slice(ROOM_CAPACITY / 2, ROOM_CAPACITY),
                ].map((row, rowIndex) => (
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
                            onClick={onOpenProfile}
                            aria-label="내 소개 수정"
                          >
                            <ForestCharacter
                              species={seat.data.species}
                              active={session.active}
                              emote={room.emotes[seat.data.userId]?.value}
                            />
                            <strong>나</strong>
                            <span className="seat-detail">
                              {session.active
                                ? `${activeTool} · ${sessionDuration}`
                                : "세션을 시작하면 앉아요"}
                            </span>
                            <span className="you-label">MY SEAT</span>
                          </button>
                        );
                      }
                      const online = isMemberOnline(seat.data, now);
                      return (
                        <button
                          type="button"
                          className={`seat mate-seat ${online ? "" : "is-offline"}`}
                          key={key}
                          title={seat.data.intro}
                          onClick={() => onPeerSelect(seat.data)}
                        >
                          <ForestCharacter
                            species={seat.data.species}
                            active={online && seat.data.active}
                            emote={room.emotes[seat.data.userId]?.value}
                          />
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
              <button type="button" className="intro-button" onClick={onOpenProfile}>
                <span className="intro-avatar">나</span>
                <span>
                  <small>한 줄 소개</small>
                  <strong>“{profile.intro}”</strong>
                </span>
                <Icon name="edit" />
              </button>
              <div className="emote-picker" aria-label="이모티콘 보내기">
                <span>가볍게 인사하기</span>
                <div>
                  {ROOM_EMOTES.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => void onSendEmote(item)}
                      aria-label={`${item} 이모티콘 띄우기`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </footer>
          </>
        )}
      </main>

      {isEditingProfile && (
        <ProfileDialog
          draftName={draftName}
          draftIntro={draftIntro}
          draftSpecies={draftSpecies}
          onNameChange={onDraftNameChange}
          onIntroChange={onDraftIntroChange}
          onSpeciesChange={onDraftSpeciesChange}
          onSave={onSaveProfile}
          onClose={onCloseProfile}
        />
      )}

      {notice && (
        <div className="toast" role="status" aria-live="polite">
          {notice}
        </div>
      )}
    </div>
  );
}
