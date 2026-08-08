import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export type AiSessionSnapshot = {
  active: boolean;
  tools: string[];
  startedAt: number | null;
};

const EMPTY_SESSION: AiSessionSnapshot = {
  active: false,
  tools: [],
  startedAt: null,
};

export function useAiSession(
  setNotice: Dispatch<SetStateAction<string | null>>,
) {
  const [session, setSession] = useState<AiSessionSnapshot>(EMPTY_SESSION);

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
  }, [setNotice]);

  return session;
}
