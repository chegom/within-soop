import { describe, expect, it } from "vitest";
import { inviteUrl, parseInviteToken } from "./invite";

const inviteToken = "a".repeat(48);

describe("room invites", () => {
  it("accepts the generated private code and matching app link", () => {
    expect(parseInviteToken(inviteToken)).toBe(inviteToken);
    expect(parseInviteToken(inviteUrl(inviteToken))).toBe(inviteToken);
  });

  it("rejects malformed codes and links before joining a room", () => {
    expect(parseInviteToken("gyeot://join/short")).toBeNull();
    expect(parseInviteToken(`https://join/${inviteToken}`)).toBeNull();
    expect(parseInviteToken(`gyeot://other/${inviteToken}`)).toBeNull();
    expect(parseInviteToken("A".repeat(48))).toBeNull();
  });
});
