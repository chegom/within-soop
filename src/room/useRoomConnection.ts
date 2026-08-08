import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { RoomApi } from "./client";
import type { RoomConnectionState } from "./types";

const RETRY_DELAYS = [2_000, 5_000, 10_000, 30_000] as const;

type UseRoomConnectionOptions = {
  client: RoomApi | null;
  currentRoomRef: MutableRefObject<string | null>;
  refreshMembers: (roomId: string) => Promise<void>;
  setError: Dispatch<SetStateAction<string | null>>;
  messageForError: (error: unknown) => string;
};

export function useRoomConnection({
  client,
  currentRoomRef,
  refreshMembers,
  setError,
  messageForError,
}: UseRoomConnectionOptions) {
  const [connection, setConnection] = useState<RoomConnectionState>(
    client ? "connecting" : "unconfigured",
  );
  const connectionRef = useRef<RoomConnectionState>(
    client ? "connecting" : "unconfigured",
  );
  const retryTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);

  const updateConnection = useCallback((nextState: RoomConnectionState) => {
    connectionRef.current = nextState;
    setConnection(nextState);
  }, []);

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
    retryAttemptRef.current = 0;
  }, []);

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
            if (currentRoomRef.current === targetRoomId) setError(null);
          })
          .catch((retryError) => {
            setError(messageForError(retryError));
          })
          .finally(() => {
            if (
              currentRoomRef.current === targetRoomId &&
              connectionRef.current !== "connected"
            ) {
              updateConnection("reconnecting");
              scheduleRetry(targetRoomId);
            }
          });
      }, delay);
    },
    [
      client,
      currentRoomRef,
      messageForError,
      refreshMembers,
      setError,
      updateConnection,
    ],
  );

  useEffect(() => clearRetry, [clearRetry]);

  return { connection, updateConnection, clearRetry, scheduleRetry };
}
