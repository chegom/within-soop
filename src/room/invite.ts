const INVITE_TOKEN = /^[a-f0-9]{48}$/;
const INVITE_PROTOCOLS = new Set(["withinsoop:", "gyeot:"]);

export function inviteUrl(token: string) {
  return `withinsoop://join/${token}`;
}

export function parseInviteToken(value: string) {
  const candidate = value.trim();
  if (INVITE_TOKEN.test(candidate)) return candidate;

  try {
    const url = new URL(candidate);
    const token = url.pathname.slice(1);
    if (
      !INVITE_PROTOCOLS.has(url.protocol) ||
      url.hostname !== "join" ||
      url.search ||
      url.hash ||
      url.pathname !== `/${token}` ||
      !INVITE_TOKEN.test(token)
    ) {
      return null;
    }
    return token;
  } catch {
    return null;
  }
}
