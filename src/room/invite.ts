const INVITE_TOKEN = /^[a-f0-9]{48}$/;
const INVITE_PROTOCOLS = new Set(["withinsoop:", "gyeot:"]);
const SHARE_ORIGIN = "https://chegom.github.io";
const SHARE_PATH = "/within-soop/";

export function inviteUrl(token: string) {
  return `${SHARE_ORIGIN}${SHARE_PATH}?join=${token}`;
}

export function appInviteUrl(token: string) {
  return `withinsoop://join/${token}`;
}

export function parseInviteToken(value: string) {
  const candidate = value.trim();
  if (INVITE_TOKEN.test(candidate)) return candidate;

  try {
    const url = new URL(candidate);
    if (INVITE_PROTOCOLS.has(url.protocol)) {
      const token = url.pathname.slice(1);
      if (
        url.hostname === "join" &&
        !url.search &&
        !url.hash &&
        url.pathname === `/${token}` &&
        INVITE_TOKEN.test(token)
      ) {
        return token;
      }
    }

    const sharedToken = url.searchParams.get("join");
    if (
      url.origin === SHARE_ORIGIN &&
      url.pathname === SHARE_PATH &&
      !url.hash &&
      url.searchParams.size === 1 &&
      sharedToken &&
      INVITE_TOKEN.test(sharedToken)
    ) {
      return sharedToken;
    }

    return null;
  } catch {
    return null;
  }
}
