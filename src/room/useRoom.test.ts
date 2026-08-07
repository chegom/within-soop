// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  RoomApi,
  RoomConnectionListener,
  RoomInvite,
  RoomSessionSnapshot,
} from "./client";
import { useRoom } from "./useRoom";

const profile = {
  displayName: "다정한 곰",
  species: "bear" as const,
  intro: "안녕",
};

const activeSession: RoomSessionSnapshot = { active: true, startedAt: 100 };

class FakeRoomClient implements RoomApi {
  heartbeats: RoomSessionSnapshot[] = [];
  private listener: RoomConnectionListener | null = null;

  async ensureAnonymousSession() {
    return "user-1";
  }

  async createRoom(): Promise<RoomInvite> {
    return {
      roomId: "room-1",
      inviteToken: "a".repeat(48),
      inviteExpiresAt: "2026-08-14T00:00:00.000Z",
    };
  }

  async joinRoom() {
    return "room-1";
  }

  async loadMembers() {
    return [];
  }

  async saveProfile() {}

  async sendHeartbeat(_roomId: string, session: RoomSessionSnapshot) {
    this.heartbeats.push(session);
  }

  subscribe(_roomId: string, listener: RoomConnectionListener) {
    this.listener = listener;
    listener.onStatus("connected");
    return () => {
      this.listener = null;
    };
  }

  async sendEmote() {}

  emitEmote(userId: string, value: string) {
    this.listener?.onEmote(value, userId);
  }
}

describe("useRoom", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends the current local session every four seconds", async () => {
    const client = new FakeRoomClient();
    const { result } = renderHook(() =>
      useRoom({ client, profile, session: activeSession }),
    );

    await act(async () => {
      await result.current.createRoom();
    });
    client.heartbeats = [];

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(client.heartbeats).toEqual([activeSession, activeSession]);
  });

  it("removes an incoming emote after four seconds", async () => {
    const client = new FakeRoomClient();
    const { result } = renderHook(() =>
      useRoom({ client, profile, session: activeSession }),
    );

    await act(async () => {
      await result.current.createRoom();
    });
    act(() => client.emitEmote("user-2", "✨"));
    expect(result.current.emotes["user-2"]?.value).toBe("✨");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_001);
    });

    expect(result.current.emotes["user-2"]).toBeUndefined();
  });
});
