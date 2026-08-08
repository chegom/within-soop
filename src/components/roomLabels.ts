import { isMemberOnline } from "../room/state";
import type { RoomConnectionState, RoomMember } from "../room/types";

export function remoteStatus(member: RoomMember, now: number) {
  if (!isMemberOnline(member, now)) return "연결 끊김";
  return member.active ? "함께 작업 중" : "자리 비움";
}

export function connectionLabel(connection: RoomConnectionState) {
  if (connection === "connected") return "연결됨";
  if (connection === "reconnecting") return "연결 다시 시도 중";
  if (connection === "connecting") return "연결 중";
  if (connection === "error") return "연결 확인 필요";
  return "연결 설정 필요";
}
