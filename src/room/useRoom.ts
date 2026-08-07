import { useCallback, useEffect, useRef, useState } from "react";
import { listenForInvite, readInitialInvite } from "./deepLink";
import { parseInviteToken } from "./invite";
import { isVisibleEmote } from "./state";
import type {
  RoomApi,
  RoomConnectionListener,
  RoomInvite,
  RoomSessionSnapshot,
} from "./client";
import type {
  GuestProfile,
  RoomConnectionState,
  RoomEmote,
  RoomMember,
} from "./types";

type UseRoomOptions = {
  client: RoomApi | null;
  profile: GuestProfile;
  session: RoomSessionSnapshot;
};

const ACTIVE_ROOM_STORAGE_KEY = "gyeot:active-room-id";
const ACTIVE_INVITE_STORAGE_KEY = "gyeot:active-invite-token";
const RETRY_DELAYS = [2_000, 5_000, 10_000, 30_000] as const;

function messageForError(error: unknown) {
  return error instanceof Error ? error.message : "room_connection_failed";
}

export function useRoom({ client, profile, session }: UseRoomOptions) {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [invite, setInvite] = useState<RoomInvite | null>(null);
  const [connection, setConnection] = useState<RoomConnectionState>(
    client ? "connecting" : "unconfigured",
  );
  const [emotes, setEmotes] = useState<Record<string, RoomEmote>>({});
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);
  const currentRoomRef = useRef<string | null>(null);
  const joinRoomRef = useRef<((inviteInput: string) => Promise<string>) | null>(null);

  const clearSubscription = useCallback(() => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
    retryAttemptRef.current = 0;
  }, []);

  const refreshMembers = useCallback(
    async (targetRoomId: string) => {
      if (!client) return;
      const nextMembers = await client.loadMembers(targetRoomId);
      if (currentRoomRef.current === targetRoomId) setMembers(nextMembers);
    },
    [client],
  );

  const scheduleRetry = useCallback(
    (targetRoomId: string) => {
      if (!client || retryTimerRef.current !== null) return;
      const index = Math.min(retryAttemptRef.current, RETRY_DELAYS.length - 1);
      const delay = RETRY_DELAYS[index];
      retryAttemptRef.current += 1;
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        void refreshMembers(targetRoomId)
          .then(() => {
            if (currentRoomRef.current === targetRoomId) setConnection("reconnecting");
          })
          .catch((retryError) => {
            setError(messageForError(retryError));
            scheduleRetry(targetRoomId);
          });
      }, delay);
    },
    [client, refreshMembers],
  );

  const startRoom = useCallback(
    async (nextRoomId: string, nextInvite: RoomInvite | null) => {
      if (!client) throw new Error("room_client_unavailable");

      clearSubscription();
      clearRetry();
      currentRoomRef.current = nextRoomId;
      setRoomId(nextRoomId);
      setInvite(nextInvite);
      setMembers([]);
      setError(null);
      setConnection("connecting");
      await refreshMembers(nextRoomId);

      const listener: RoomConnectionListener = {
        onChange: () => {
          void refreshMembers(nextRoomId).catch((refreshError) => {
            setError(messageForError(refreshError));
          });
        },
        onEmote: (value, userId) => {
          setEmotes((current) => ({
            ...current,
            [userId]: { userId, value, expiresAt: Date.now() + 4_000 },
          }));
        },
        onStatus: (nextState) => {
          setConnection(nextState);
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
    [client, clearRetry, clearSubscription, refreshMembers, scheduleRetry],
  );

  useEffect(() => {
    if (!client || !roomId) return undefined;
    const send = () => {
      void client.sendHeartbeat(roomId, session).catch((heartbeatError) => {
        setConnection("reconnecting");
        setError(messageForError(heartbeatError));
        scheduleRetry(roomId);
      });
    };

    send();
    const heartbeatTimer = window.setInterval(send, 4_000);
    return () => window.clearInterval(heartbeatTimer);
  }, [client, roomId, scheduleRetry, session]);

  useEffect(() => {
    const emoteTimer = window.setInterval(() => {
      const now = Date.now();
      setEmotes((current) => {
        const next = Object.fromEntries(
          Object.entries(current).filter(([, emote]) => isVisibleEmote(emote, now)),
        ) as Record<string, RoomEmote>;
        return Object.keys(next).length === Object.keys(current).length ? current : next;
      });
    }, 250);
    return () => window.clearInterval(emoteTimer);
  }, []);

  const createRoom = useCallback(async () => {
    if (!client) throw new Error("room_client_unavailable");
    const nextInvite = await client.createRoom(profile);
    localStorage.setItem(ACTIVE_ROOM_STORAGE_KEY, nextInvite.roomId);
    localStorage.setItem(ACTIVE_INVITE_STORAGE_KEY, nextInvite.inviteToken);
    await startRoom(nextInvite.roomId, nextInvite);
    return nextInvite;
  }, [client, profile, startRoom]);

  const joinRoom = useCallback(
    async (inviteInput: string) => {
      if (!client) throw new Error("room_client_unavailable");
      const roomToken = parseInviteToken(inviteInput);
      if (!roomToken) throw new Error("invalid_invite");
      const nextRoomId = await client.joinRoom(roomToken, profile);
      const nextInvite = { roomId: nextRoomId, inviteToken: roomToken };
      localStorage.setItem(ACTIVE_ROOM_STORAGE_KEY, nextRoomId);
      localStorage.setItem(ACTIVE_INVITE_STORAGE_KEY, roomToken);
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
      setConnection("unconfigured");
      return undefined;
    }

    const joinInvite = async (token: string) => {
      try {
        await joinRoomRef.current?.(token);
      } catch (joinError) {
        if (!cancelled) {
          setConnection("error");
          setError(messageForError(joinError));
        }
      }
    };

    void client
      .ensureAnonymousSession()
      .then(async () => {
        if (cancelled) return;
        const initialInvite = await readInitialInvite();
        if (initialInvite) {
          await joinInvite(initialInvite);
        } else {
          const storedRoomId = localStorage.getItem(ACTIVE_ROOM_STORAGE_KEY);
          const storedInviteToken = localStorage.getItem(ACTIVE_INVITE_STORAGE_KEY);
          const storedInvite = storedInviteToken
            ? { roomId: storedRoomId ?? "", inviteToken: storedInviteToken }
            : null;
          if (storedRoomId) await startRoom(storedRoomId, storedInvite);
          else setConnection("connected");
        }

        const stopListening = await listenForInvite((token) => {
          void joinInvite(token);
        });
        if (cancelled) stopListening();
        else unlisten = stopListening;
      })
      .catch((initializationError) => {
        if (!cancelled) {
          setConnection("error");
          setError(messageForError(initializationError));
        }
      });

    return () => {
      cancelled = true;
      unlisten();
      clearSubscription();
      clearRetry();
    };
  }, [client, clearRetry, clearSubscription, startRoom]);

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
      if (!client || !roomId) return;
      await client.sendEmote(roomId, value);
    },
    [client, roomId],
  );

  return {
    members,
    roomId,
    invite,
    connection,
    emotes,
    error,
    createRoom,
    joinRoom,
    saveProfile,
    sendEmote,
  };
}
