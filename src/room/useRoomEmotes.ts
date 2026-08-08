import { useCallback, useEffect, useState } from "react";
import { EMOTE_VISIBLE_MS } from "./constants";
import { isVisibleEmote } from "./state";
import type { RoomEmote } from "./types";

export function useRoomEmotes() {
  const [emotes, setEmotes] = useState<Record<string, RoomEmote>>({});

  const showEmote = useCallback((userId: string, value: string) => {
    setEmotes((current) => ({
      ...current,
      [userId]: { userId, value, expiresAt: Date.now() + EMOTE_VISIBLE_MS },
    }));
  }, []);

  const clearEmotes = useCallback(() => setEmotes({}), []);

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

  return { emotes, showEmote, clearEmotes };
}
