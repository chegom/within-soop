import { isTauri } from "@tauri-apps/api/core";
import { parseInviteToken } from "./invite";

export type DeepLinkApi = {
  getCurrent(): Promise<string[] | null>;
  onOpenUrl(handler: (urls: string[]) => void): Promise<() => void>;
};

async function desktopDeepLinkApi(): Promise<DeepLinkApi | null> {
  if (!isTauri()) return null;
  return import("@tauri-apps/plugin-deep-link");
}

function inviteFromUrls(urls: string[]) {
  for (const url of urls) {
    const token = parseInviteToken(url);
    if (token) return token;
  }
  return null;
}

export async function readInitialInvite(api?: DeepLinkApi) {
  const deepLink = api ?? (await desktopDeepLinkApi());
  if (!deepLink) return null;
  return inviteFromUrls((await deepLink.getCurrent()) ?? []);
}

export async function listenForInvite(
  onInvite: (token: string) => void,
  api?: DeepLinkApi,
) {
  const deepLink = api ?? (await desktopDeepLinkApi());
  if (!deepLink) return () => undefined;
  return deepLink.onOpenUrl((urls) => {
    const token = inviteFromUrls(urls);
    if (token) onInvite(token);
  });
}
