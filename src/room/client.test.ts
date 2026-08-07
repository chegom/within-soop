import { describe, expect, it } from "vitest";
import {
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

describe("RoomClient", () => {
  it("creates an anonymous session only when none exists", async () => {
    const transport = new FakeTransport(null);
    const client = new RoomClient(transport);

    await client.ensureAnonymousSession();
    await client.ensureAnonymousSession();

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
});
