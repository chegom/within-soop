import { useState } from "react";
import { DISPLAY_NAME_MAX_LENGTH } from "../room/constants";
import { parseInviteToken } from "../room/invite";
import type { RoomConnectionState } from "../room/types";

type RoomSetupProps = {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onCreate: () => Promise<unknown> | void;
  onJoin: (invite: string) => Promise<unknown> | void;
  connection: RoomConnectionState;
  error: string | null;
};

function roomMessage(connection: RoomConnectionState, error: string | null) {
  if (error?.includes("invalid_invite")) return "초대 코드를 확인해 주세요";
  if (error?.includes("expired_invite")) return "초대 링크가 만료되었어요";
  if (error?.includes("room_full")) return "방이 가득 찼어요";
  if (error?.includes("room_access_lost")) {
    return "이전 작업실에 다시 들어갈 수 없어 새 작업실을 선택해 주세요";
  }
  if (connection === "reconnecting") return "연결을 다시 시도하고 있어요";
  if (connection === "unconfigured") return "연결 설정을 확인해 주세요";
  if (error) return "작업실 연결을 확인해 주세요";
  return null;
}

export function RoomSetup({
  displayName,
  onDisplayNameChange,
  onCreate,
  onJoin,
  connection,
  error,
}: RoomSetupProps) {
  const [inviteInput, setInviteInput] = useState("");
  const [pending, setPending] = useState<"create" | "join" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const inviteToken = parseInviteToken(inviteInput);
  const message = roomMessage(connection, actionError ?? error);
  const unavailable = connection === "unconfigured";

  const run = async (kind: "create" | "join") => {
    setPending(kind);
    setActionError(null);
    try {
      if (kind === "create") await onCreate();
      else if (inviteToken) await onJoin(inviteToken);
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : "room_connection_failed");
    } finally {
      setPending(null);
    }
  };

  return (
    <section className="room-setup" aria-labelledby="room-setup-title">
      <div className="room-setup-card">
        <span className="eyebrow">WITH · IN · SOOP</span>
        <h1 id="room-setup-title">먼저 방을 열거나, 초대에 참여해요</h1>
        <p>가입 없이 표시 이름과 동물 캐릭터만 공유해요.</p>

        <label className="room-field">
          <span>표시 이름</span>
          <input
            value={displayName}
            onChange={(event) =>
              onDisplayNameChange(event.target.value.slice(0, DISPLAY_NAME_MAX_LENGTH))
            }
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            aria-label="표시 이름"
          />
        </label>

        <button
          type="button"
          className="primary-button room-create-button"
          disabled={unavailable || pending !== null}
          onClick={() => void run("create")}
        >
          {pending === "create" ? "방을 여는 중…" : "방 만들기"}
        </button>

        <div className="room-setup-divider"><span>또는</span></div>

        <label className="room-field room-code-field">
          <span>초대 코드</span>
          <input
            value={inviteInput}
            onChange={(event) => setInviteInput(event.target.value)}
            placeholder="48자리 초대 코드 또는 링크"
            aria-label="초대 코드"
          />
        </label>
        <button
          type="button"
          className="ghost-button room-join-button"
          disabled={unavailable || pending !== null || !inviteToken}
          onClick={() => void run("join")}
        >
          {pending === "join" ? "참여하는 중…" : "참여하기"}
        </button>

        {message && (
          <p className="room-connection-status" role="status" aria-live="polite">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
