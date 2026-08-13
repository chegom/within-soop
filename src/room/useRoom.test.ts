// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const deepLink = vi.hoisted(() => ({
  initialInvite: null as string | null,
  onInvite: null as ((token: string) => void) | null,
  readInitialInvite: vi.fn(),
  listenForInvite: vi.fn(),
}));

vi.mock("./deepLink", () => ({
  readInitialInvite: deepLink.readInitialInvite,
  listenForInvite: deepLink.listenForInvite,
}));

import type {
  RoomApi,
  RoomConnectionListener,
  RoomInvite,
  RoomSessionSnapshot,
} from "./client";
import type { RoomMember } from "./types";
import { useRoom } from "./useRoom";

const profile = {
  displayName: "다정한 곰",
  species: "bear" as const,
  intro: "안녕",
};

const activeSession: RoomSessionSnapshot = { active: true, startedAt: 100 };

const selfMember: RoomMember = {
  roomId: "room-1",
  userId: "user-1",
  ...profile,
  active: true,
  startedAt: 100_000,
  lastSeenAt: 100_000,
};

class FakeRoomClient implements RoomApi {
  heartbeats: RoomSessionSnapshot[] = [];
  joinedTokens: string[] = [];
  loadMembersCalls = 0;
  globalOnlineCountCalls = 0;
  onlineCount = 1;
  members: RoomMember[] = [selfMember];
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

  async joinRoom(token: string) {
    this.joinedTokens.push(token);
    return "room-1";
  }

  async loadMembers() {
    this.loadMembersCalls += 1;
    return this.members;
  }

  async loadGlobalOnlineCount() {
    this.globalOnlineCountCalls += 1;
    return this.onlineCount;
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

  emitChange(member: RoomMember | null) {
    this.listener?.onChange(member);
  }

  emitStatus(state: Parameters<RoomConnectionListener["onStatus"]>[0]) {
    this.listener?.onStatus(state);
  }
}

describe("useRoom", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    deepLink.initialInvite = null;
    deepLink.onInvite = null;
    deepLink.readInitialInvite.mockImplementation(async () => deepLink.initialInvite);
    deepLink.listenForInvite.mockImplementation(async (onInvite) => {
      deepLink.onInvite = onInvite;
      return () => {
        deepLink.onInvite = null;
      };
    });
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

  it("refreshes the real global online count every fifteen seconds", async () => {
    const client = new FakeRoomClient();
    client.onlineCount = 7;
    const { result } = renderHook(() =>
      useRoom({ client, profile, session: activeSession }),
    );

    await act(async () => {
      await result.current.createRoom();
      await Promise.resolve();
    });

    expect(result.current.globalOnlineCount).toBe(7);
    expect(client.globalOnlineCountCalls).toBe(1);

    client.onlineCount = 8;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(result.current.globalOnlineCount).toBe(8);
    expect(client.globalOnlineCountCalls).toBe(2);
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

  it("merges realtime member changes without reloading the room", async () => {
    const client = new FakeRoomClient();
    const { result } = renderHook(() =>
      useRoom({ client, profile, session: activeSession }),
    );

    await act(async () => {
      await result.current.createRoom();
    });
    client.loadMembersCalls = 0;
    const peer: RoomMember = {
      ...selfMember,
      userId: "user-2",
      displayName: "집중한 여우",
      species: "fox",
      lastSeenAt: 110_000,
    };

    act(() => client.emitChange(peer));

    expect(result.current.members).toEqual([selfMember, peer]);
    const updatedPeer = { ...peer, active: false, lastSeenAt: 120_000 };
    act(() => client.emitChange(updatedPeer));

    expect(result.current.members).toEqual([selfMember, updatedPeer]);
    expect(client.loadMembersCalls).toBe(0);
  });

  it("falls back to a room reload for an invalid realtime payload", async () => {
    const client = new FakeRoomClient();
    const { result } = renderHook(() =>
      useRoom({ client, profile, session: activeSession }),
    );

    await act(async () => {
      await result.current.createRoom();
    });
    client.loadMembersCalls = 0;

    await act(async () => {
      client.emitChange(null);
      await Promise.resolve();
    });

    expect(client.loadMembersCalls).toBe(1);
  });

  it("updates the local profile without reloading the room", async () => {
    const client = new FakeRoomClient();
    const { result } = renderHook(() =>
      useRoom({ client, profile, session: activeSession }),
    );

    await act(async () => {
      await result.current.createRoom();
    });
    client.loadMembersCalls = 0;
    const nextProfile = {
      displayName: "집중한 여우",
      species: "fox" as const,
      intro: "실시간 최적화 중",
    };

    await act(async () => {
      await result.current.saveProfile(nextProfile);
    });

    expect(result.current.members[0]).toMatchObject(nextProfile);
    expect(client.loadMembersCalls).toBe(0);
  });

  it("shows a sent emote locally before the broadcast comes back", async () => {
    const client = new FakeRoomClient();
    const { result } = renderHook(() =>
      useRoom({ client, profile, session: activeSession }),
    );

    await act(async () => {
      await result.current.createRoom();
      await result.current.sendEmote("👋");
    });

    expect(result.current.emotes["user-1"]?.value).toBe("👋");
  });

  it("joins an invite passed through the desktop deep link", async () => {
    const client = new FakeRoomClient();
    const inviteToken = "b".repeat(48);
    deepLink.initialInvite = inviteToken;

    const { result } = renderHook(() =>
      useRoom({ client, profile, session: activeSession }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(client.joinedTokens).toEqual([inviteToken]);
    expect(result.current.roomId).toBe("room-1");
  });

  it("keeps refreshing with backoff until the realtime channel reconnects", async () => {
    const client = new FakeRoomClient();
    const { result } = renderHook(() =>
      useRoom({ client, profile, session: activeSession }),
    );

    await act(async () => {
      await result.current.createRoom();
    });
    client.loadMembersCalls = 0;

    act(() => client.emitStatus("reconnecting"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(client.loadMembersCalls).toBe(2);
    expect(result.current.connection).toBe("reconnecting");

    act(() => client.emitStatus("connected"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(result.current.connection).toBe("connected");
    expect(client.loadMembersCalls).toBe(3);
  });

  it("clears a stored room when the anonymous user no longer has access", async () => {
    const client = new FakeRoomClient();
    client.members = [];
    localStorage.setItem("gyeot:active-room-id", "stale-room");
    localStorage.setItem("gyeot:active-invite-token", "d".repeat(48));

    const { result } = renderHook(() =>
      useRoom({ client, profile, session: activeSession }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.roomId).toBeNull();
    expect(result.current.connection).toBe("connected");
    expect(result.current.error).toBe("room_access_lost");
    expect(localStorage.getItem("gyeot:active-room-id")).toBeNull();
    expect(localStorage.getItem("gyeot:active-invite-token")).toBeNull();
  });

  it("leaves the active room locally and returns to setup", async () => {
    const client = new FakeRoomClient();
    const { result } = renderHook(() =>
      useRoom({ client, profile, session: activeSession }),
    );

    await act(async () => {
      await result.current.createRoom();
    });
    act(() => result.current.leaveRoom());

    expect(result.current.roomId).toBeNull();
    expect(result.current.connection).toBe("connected");
    expect(localStorage.getItem("gyeot:active-room-id")).toBeNull();
    expect(localStorage.getItem("gyeot:active-invite-token")).toBeNull();
  });
});
