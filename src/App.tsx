import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CompactRoomView } from "./components/CompactRoomView";
import { FullRoomView } from "./components/FullRoomView";
import { useAiSession } from "./native/useAiSession";
import { useWindowMode } from "./native/useWindowMode";
import { createRoomClient, type RoomSessionSnapshot } from "./room/client";
import type { ForestSpecies } from "./room/constants";
import { inviteUrl } from "./room/invite";
import {
  normalizeDisplayName,
  normalizeIntro,
} from "./room/profile";
import { loadGuestProfile, storeGuestProfile } from "./room/profileStorage";
import { buildSeats } from "./room/state";
import type { GuestProfile, RoomMember } from "./room/types";
import { useRoom } from "./room/useRoom";
import "./App.css";

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}시간 ${minutes}분째` : `${hours}시간째`;
  if (minutes > 0) return `${minutes}분째`;
  return "방금 시작";
}

function App() {
  const [now, setNow] = useState(Date.now);
  const [profile, setProfile] = useState<GuestProfile>(loadGuestProfile);
  const [draftName, setDraftName] = useState(profile.displayName);
  const [draftIntro, setDraftIntro] = useState(profile.intro);
  const [draftSpecies, setDraftSpecies] = useState<ForestSpecies>(profile.species);
  const [isEditingIntro, setIsEditingIntro] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const session = useAiSession(setNotice);
  const {
    viewMode,
    setViewMode,
    usesNativeCompactOpacity,
    compactOpacity,
    setCompactOpacity,
  } = useWindowMode(setNotice);
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
    setNotice("소개를 바꿨어요");
  };

  const openIntroEditor = () => {
    setDraftName(profile.displayName);
    setDraftIntro(profile.intro);
    setDraftSpecies(profile.species);
    setIsEditingIntro(true);
  };

  const saveCompactIntro = (intro: string) => {
    persistProfile({ ...profile, intro: normalizeIntro(intro) });
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
      <CompactRoomView
        session={session}
        activeTool={activeTool}
        sessionDuration={sessionDuration}
        selfMember={selfMember}
        peers={peers}
        roomEmotes={room.emotes}
        profileIntro={profile.intro}
        now={now}
        roomMemberCount={roomMemberCount}
        globalOnlineCount={room.globalOnlineCount}
        connection={room.connection}
        compactOpacity={compactOpacity}
        usesNativeCompactOpacity={usesNativeCompactOpacity}
        notice={notice}
        onExpand={() => setViewMode("full")}
        onClose={closeWindow}
        onDrag={beginCompactDrag}
        onOpacityChange={setCompactOpacity}
        onSendEmote={sendEmote}
        onSaveIntro={saveCompactIntro}
      />
    );
  }

  return (
    <FullRoomView
      session={session}
      activeTool={activeTool}
      sessionDuration={sessionDuration}
      profile={profile}
      room={room}
      seats={seats}
      now={now}
      roomMemberCount={roomMemberCount}
      notice={notice}
      isEditingProfile={isEditingIntro}
      draftName={draftName}
      draftIntro={draftIntro}
      draftSpecies={draftSpecies}
      onCompact={() => setViewMode("compact")}
      onSetupNameChange={updateSetupName}
      onCreateRoom={createRoom}
      onJoinRoom={joinRoom}
      onCopyInvite={copyInvite}
      onSendEmote={sendEmote}
      onOpenProfile={openIntroEditor}
      onCloseProfile={() => setIsEditingIntro(false)}
      onSaveProfile={saveIntro}
      onDraftNameChange={setDraftName}
      onDraftIntroChange={setDraftIntro}
      onDraftSpeciesChange={setDraftSpecies}
      onPeerSelect={(member) => setNotice(`${member.displayName} · “${member.intro}”`)}
    />
  );
}

export default App;
