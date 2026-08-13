import { describe, expect, it } from "vitest";
import {
  parseRoomMemberChange,
  RoomClient,
  type RoomConnectionListener,
  type RoomTransport,
} from "./client";

class FakeTransport implements RoomTransport {
  anonymousSignIns = 0;
  broadcasts: Array<{
    topic: string;
    event: "emote";
    payload: { value: string; userId: string };
  }> = [];
  onlineCount = 0;

  constructor(private sessionUserId: string | null) {}

  async getSession() {
    return this.sessionUserId;
  }

  async signInAnonymously() {
    this.anonymousSignIns += 1;
    this.sessionUserId = "user-1";
    return this.sessionUserId;
  }

  async rpc<T>() {
    return {} as T;
  }

  async globalOnlineCount() {
    return this.onlineCount;
  }

  async members() {
    return [];
  }

  async updateMember() {}

  subscribe(_topic: string, _listener: RoomConnectionListener) {
    return () => undefined;
  }

  async broadcast(
    topic: string,
    event: "emote",
    payload: { value: string; userId: string },
  ) {
    this.broadcasts.push({ topic, event, payload });
  }
}

const broadcastMemberRow = {
  room_id: "room-1",
  user_id: "user-2",
  display_name: "집중한 여우",
  species: "fox",
  intro: "안녕",
  active: true,
  started_at: "2026-08-11T00:00:00.000Z",
  last_seen_at: "2026-08-11T00:00:04.000Z",
};

describe("RoomClient", () => {
  it.each(["record", "new"] as const)(
    "parses a full member row from the database broadcast %s field",
    (rowField) => {
      expect(
        parseRoomMemberChange({
          schema: "public",
          table: "room_members",
          eventType: "UPDATE",
          [rowField]: broadcastMemberRow,
        }),
      ).toEqual({
        roomId: "room-1",
        userId: "user-2",
        displayName: "집중한 여우",
        species: "fox",
        intro: "안녕",
        active: true,
        startedAt: Date.parse("2026-08-11T00:00:00.000Z"),
        lastSeenAt: Date.parse("2026-08-11T00:00:04.000Z"),
      });
    },
  );

  it("rejects an incomplete database broadcast", () => {
    expect(parseRoomMemberChange({ new: { user_id: "user-2" } })).toBeNull();
    expect(parseRoomMemberChange(null)).toBeNull();
  });

  it("creates an anonymous session only when none exists", async () => {
    const transport = new FakeTransport(null);
    const client = new RoomClient(transport);

    await client.ensureAnonymousSession();
    await client.ensureAnonymousSession();

    expect(transport.anonymousSignIns).toBe(1);
  });

  it("shares an in-flight anonymous sign-in across concurrent room actions", async () => {
    const transport = new FakeTransport(null);
    const client = new RoomClient(transport);

    const userIds = await Promise.all([
      client.ensureAnonymousSession(),
      client.ensureAnonymousSession(),
    ]);

    expect(userIds).toEqual(["user-1", "user-1"]);
    expect(transport.anonymousSignIns).toBe(1);
  });

  it("sends an emote on the private room topic for its own user", async () => {
    const transport = new FakeTransport("user-1");
    const client = new RoomClient(transport);

    await client.sendEmote("room-1", "🔥");

    expect(transport.broadcasts).toEqual([
      {
        topic: "room:room-1",
        event: "emote",
        payload: { value: "🔥", userId: "user-1" },
      },
    ]);
  });

  it("loads the authenticated aggregate online count", async () => {
    const transport = new FakeTransport("user-1");
    transport.onlineCount = 12;

    await expect(new RoomClient(transport).loadGlobalOnlineCount()).resolves.toBe(12);
  });
});
