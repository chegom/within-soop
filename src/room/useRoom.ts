import { useCallback, useEffect, useRef, useState } from "react";
import { listenForInvite, readInitialInvite } from "./deepLink";
import { HEARTBEAT_INTERVAL_MS } from "./constants";
import { parseInviteToken } from "./invite";
import type {
  RoomApi,
  RoomConnectionListener,
  RoomInvite,
  RoomSessionSnapshot,
} from "./client";
import type {
  GuestProfile,
  RoomConnectionState,
  RoomMember,
} from "./types";
import { useRoomConnection } from "./useRoomConnection";
import { useRoomEmotes } from "./useRoomEmotes";

type UseRoomOptions = {
  client: RoomApi | null;
  profile: GuestProfile;
  session: RoomSessionSnapshot;
};

const ACTIVE_ROOM_STORAGE_KEY = "gyeot:active-room-id";
const ACTIVE_INVITE_STORAGE_KEY = "gyeot:active-invite-token";

function clearStoredRoom() {
  localStorage.removeItem(ACTIVE_ROOM_STORAGE_KEY);
  localStorage.removeItem(ACTIVE_INVITE_STORAGE_KEY);
}

function messageForError(error: unknown) {
  return error instanceof Error ? error.message : "room_connection_failed";
}

export function useRoom({ client, profile, session }: UseRoomOptions) {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [invite, setInvite] = useState<RoomInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const currentRoomRef = useRef<string | null>(null);
  const joinRoomRef = useRef<((inviteInput: string) => Promise<string>) | null>(null);
  const { emotes, showEmote, clearEmotes } = useRoomEmotes();

  const clearSubscription = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);

  const refreshMembers = useCallback(
    async (targetRoomId: string) => {
      if (!client) return;
      const nextMembers = await client.loadMembers(targetRoomId);
      if (currentRoomRef.current === targetRoomId) setMembers(nextMembers);
    },
    [client],
  );
  const { connection, updateConnection, clearRetry, scheduleRetry } =
    useRoomConnection({
      client,
      currentRoomRef,
      refreshMembers,
      setError,
      messageForError,
    });

  const resetRoom = useCallback(
    (nextConnection: RoomConnectionState, nextError: string | null = null) => {
      clearSubscription();
      clearRetry();
      clearStoredRoom();
      currentRoomRef.current = null;
      setRoomId(null);
      setInvite(null);
      setMembers([]);
      clearEmotes();
      setError(nextError);
      updateConnection(nextConnection);
    },
    [clearEmotes, clearRetry, clearSubscription, updateConnection],
  );

  const startRoom = useCallback(
    async (nextRoomId: string, nextInvite: RoomInvite | null) => {
      if (!client) throw new Error("room_client_unavailable");

      clearSubscription();
      clearRetry();
      clearStoredRoom();
      currentRoomRef.current = nextRoomId;
      setRoomId(null);
      setInvite(null);
      setMembers([]);
      clearEmotes();
      setError(null);
      updateConnection("connecting");

      try {
        const currentUserId = await client.ensureAnonymousSession();
        const nextMembers = await client.loadMembers(nextRoomId);
        if (!nextMembers.some((member) => member.userId === currentUserId)) {
          throw new Error("room_access_lost");
        }
        if (currentRoomRef.current !== nextRoomId) {
          throw new Error("room_transition_cancelled");
        }

        setUserId(currentUserId);
        setRoomId(nextRoomId);
        setInvite(nextInvite);
        setMembers(nextMembers);
        localStorage.setItem(ACTIVE_ROOM_STORAGE_KEY, nextRoomId);
        if (nextInvite?.inviteToken) {
          localStorage.setItem(ACTIVE_INVITE_STORAGE_KEY, nextInvite.inviteToken);
        }
      } catch (startError) {
        if (currentRoomRef.current === nextRoomId) {
          resetRoom(client ? "connected" : "unconfigured", messageForError(startError));
        }
        throw startError;
      }

      const listener: RoomConnectionListener = {
        onChange: () => {
          void refreshMembers(nextRoomId).catch((refreshError) => {
            setError(messageForError(refreshError));
          });
        },
        onEmote: (value, userId) => {
          showEmote(userId, value);
        },
        onStatus: (nextState) => {
          updateConnection(nextState);
          if (nextState === "connected") {
            clearRetry();
            void refreshMembers(nextRoomId).catch((refreshError) => {
              setError(messageForError(refreshError));
            });
          } else if (nextState === "reconnecting" || nextState === "error") {
            scheduleRetry(nextRoomId);
          }
        },
      };
      unsubscribeRef.current = client.subscribe(nextRoomId, listener);
    },
    [
      client,
      clearRetry,
      clearEmotes,
      clearSubscription,
      refreshMembers,
      resetRoom,
      scheduleRetry,
      showEmote,
      updateConnection,
    ],
  );

  useEffect(() => {
    if (!client || !roomId) return undefined;
    const send = () => {
      void client.sendHeartbeat(roomId, session).catch((heartbeatError) => {
        updateConnection("reconnecting");
        setError(messageForError(heartbeatError));
        scheduleRetry(roomId);
      });
    };

    send();
    const heartbeatTimer = window.setInterval(send, HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(heartbeatTimer);
  }, [client, roomId, scheduleRetry, session, updateConnection]);

  const createRoom = useCallback(async () => {
    if (!client) throw new Error("room_client_unavailable");
    setUserId(await client.ensureAnonymousSession());
    const nextInvite = await client.createRoom(profile);
    await startRoom(nextInvite.roomId, nextInvite);
    return nextInvite;
  }, [client, profile, startRoom]);

  const joinRoom = useCallback(
    async (inviteInput: string) => {
      if (!client) throw new Error("room_client_unavailable");
      const roomToken = parseInviteToken(inviteInput);
      if (!roomToken) throw new Error("invalid_invite");
      setUserId(await client.ensureAnonymousSession());
      const nextRoomId = await client.joinRoom(roomToken, profile);
      const nextInvite = { roomId: nextRoomId, inviteToken: roomToken };
      await startRoom(nextRoomId, nextInvite);
      return nextRoomId;
    },
    [client, profile, startRoom],
  );

  useEffect(() => {
    joinRoomRef.current = joinRoom;
  }, [joinRoom]);

  useEffect(() => {
    let cancelled = false;
    let unlisten: () => void = () => undefined;
    if (!client) {
      updateConnection("unconfigured");
      return undefined;
    }

    const joinInvite = async (token: string) => {
      try {
        await joinRoomRef.current?.(token);
      } catch (joinError) {
        if (!cancelled) {
          updateConnection("error");
          setError(messageForError(joinError));
        }
      }
    };

    void client
      .ensureAnonymousSession()
      .then(async (anonymousUserId) => {
        if (cancelled) return;
        setUserId(anonymousUserId);
        const initialInvite = await readInitialInvite();
        if (initialInvite) {
          await joinInvite(initialInvite);
        } else {
          const storedRoomId = localStorage.getItem(ACTIVE_ROOM_STORAGE_KEY);
          const storedInviteToken = localStorage.getItem(ACTIVE_INVITE_STORAGE_KEY);
          const storedInvite = storedInviteToken
            ? { roomId: storedRoomId ?? "", inviteToken: storedInviteToken }
            : null;
          if (storedRoomId) {
            try {
              await startRoom(storedRoomId, storedInvite);
            } catch {
              // startRoom clears stale local room state and keeps setup usable.
            }
          } else updateConnection("connected");
        }

        const stopListening = await listenForInvite((token) => {
          void joinInvite(token);
        });
        if (cancelled) stopListening();
        else unlisten = stopListening;
      })
      .catch((initializationError) => {
        if (!cancelled) {
          updateConnection("error");
          setError(messageForError(initializationError));
        }
      });

    return () => {
      cancelled = true;
      unlisten();
      clearSubscription();
      clearRetry();
    };
  }, [client, clearRetry, clearSubscription, startRoom, updateConnection]);

  const saveProfile = useCallback(
    async (nextProfile: GuestProfile) => {
      if (!client || !roomId) return;
      await client.saveProfile(roomId, nextProfile);
      await refreshMembers(roomId);
    },
    [client, refreshMembers, roomId],
  );

  const sendEmote = useCallback(
    async (value: string) => {
      const targetRoomId = roomId ?? currentRoomRef.current;
      if (!client || !targetRoomId) return;
      const senderId = userId ?? (await client.ensureAnonymousSession());
      if (!userId) setUserId(senderId);
      showEmote(senderId, value);
      await client.sendEmote(targetRoomId, value);
    },
    [client, roomId, showEmote, userId],
  );

  const leaveRoom = useCallback(() => {
    resetRoom(client ? "connected" : "unconfigured");
  }, [client, resetRoom]);

  return {
    members,
    userId,
    roomId,
    invite,
    connection,
    emotes,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    saveProfile,
    sendEmote,
  };
}

export type UseRoomResult = ReturnType<typeof useRoom>;
