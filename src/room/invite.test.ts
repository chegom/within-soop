import { describe, expect, it } from "vitest";
import { appInviteUrl, inviteUrl, parseInviteToken } from "./invite";

const inviteToken = "a".repeat(48);

describe("room invites", () => {
  it("accepts the generated private code and matching app link", () => {
    expect(parseInviteToken(inviteToken)).toBe(inviteToken);
    expect(inviteUrl(inviteToken)).toBe(
      `https://chegom.github.io/within-soop/?join=${inviteToken}`,
    );
    expect(parseInviteToken(inviteUrl(inviteToken))).toBe(inviteToken);
    expect(appInviteUrl(inviteToken)).toBe(`withinsoop://join/${inviteToken}`);
    expect(parseInviteToken(appInviteUrl(inviteToken))).toBe(inviteToken);
    expect(parseInviteToken(`gyeot://join/${inviteToken}`)).toBe(inviteToken);
  });

  it("rejects malformed codes and links before joining a room", () => {
    expect(parseInviteToken("withinsoop://join/short")).toBeNull();
    expect(parseInviteToken(`https://join/${inviteToken}`)).toBeNull();
    expect(
      parseInviteToken(
        `https://chegom.github.io/within-soop/?join=${inviteToken}&extra=1`,
      ),
    ).toBeNull();
    expect(
      parseInviteToken(`https://example.com/within-soop/?join=${inviteToken}`),
    ).toBeNull();
    expect(parseInviteToken(`withinsoop://other/${inviteToken}`)).toBeNull();
    expect(parseInviteToken("A".repeat(48))).toBeNull();
  });
});
