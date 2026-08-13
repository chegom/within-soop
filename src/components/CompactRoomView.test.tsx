// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RoomMember } from "../room/types";
import { CompactRoomView } from "./CompactRoomView";

const selfMember: RoomMember = {
  roomId: "room-1",
  userId: "user-1",
  displayName: "다정한 곰",
  species: "bear",
  intro: "조용히 무언가를 만드는 중",
  active: true,
  startedAt: 1_000,
  lastSeenAt: 2_000,
};

describe("CompactRoomView", () => {
  it("reveals the locally detected AI tools from the compact status", () => {
    render(
      <CompactRoomView
        session={{ active: true, tools: ["Codex", "Claude Code"], startedAt: 1 }}
        activeTool="Codex + Claude Code"
        sessionDuration="34분째"
        selfMember={selfMember}
        peers={[]}
        roomEmotes={{}}
        profileIntro={selfMember.intro}
        now={2_000}
        roomMemberCount={1}
        globalOnlineCount={302}
        connection="connected"
        compactOpacity={100}
        usesNativeCompactOpacity
        notice={null}
        onExpand={vi.fn()}
        onClose={vi.fn()}
        onDrag={vi.fn()}
        onOpacityChange={vi.fn()}
        onSendEmote={vi.fn()}
        onSaveIntro={vi.fn()}
      />,
    );

    expect(screen.getByText("Codex + Claude Code 감지됨")).toBeTruthy();
    expect(screen.getByText("파티원 1명")).toBeTruthy();
    expect(screen.getByText("지금 함께 302명")).toBeTruthy();
    expect(screen.getByText("연결됨")).toBeTruthy();
  });
});
