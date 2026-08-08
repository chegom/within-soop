import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export type ViewMode = "full" | "compact";

export function useWindowMode(
  setNotice: Dispatch<SetStateAction<string | null>>,
) {
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    localStorage.getItem("gyeot:view-mode") === "compact" ? "compact" : "full",
  );
  const [usesNativeCompactOpacity, setUsesNativeCompactOpacity] = useState(false);
  const [compactOpacity, setCompactOpacity] = useState(() => {
    const saved = Number(localStorage.getItem("gyeot:compact-opacity") ?? "70");
    return Number.isFinite(saved) ? Math.min(100, Math.max(5, saved)) : 70;
  });

  useEffect(() => {
    const isTauri = "__TAURI_INTERNALS__" in window;
    document.documentElement.dataset.viewMode = viewMode;
    localStorage.setItem("gyeot:view-mode", viewMode);
    if (isTauri) {
      void invoke("set_window_mode", { compact: viewMode === "compact" }).catch(() => {
        setNotice("창 크기를 바꾸지 못했어요");
      });
    }
  }, [setNotice, viewMode]);

  useEffect(() => {
    localStorage.setItem("gyeot:compact-opacity", String(compactOpacity));
  }, [compactOpacity]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) {
      setUsesNativeCompactOpacity(false);
      return;
    }
    const opacity = viewMode === "compact" ? compactOpacity / 100 : 1;
    void invoke<boolean>("set_window_opacity", { opacity })
      .then(setUsesNativeCompactOpacity)
      .catch(() => {
        setUsesNativeCompactOpacity(false);
        setNotice("투명도를 적용하지 못했어요");
      });
  }, [compactOpacity, setNotice, viewMode]);

  return {
    viewMode,
    setViewMode,
    usesNativeCompactOpacity,
    compactOpacity,
    setCompactOpacity,
  };
}
