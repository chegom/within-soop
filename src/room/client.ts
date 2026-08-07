import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { parseInviteToken } from "./invite";
import { normalizeDisplayName, normalizeIntro } from "./profile";
import { supabase } from "./supabase";
import type {
  GuestProfile,
  RoomConnectionState,
  RoomMember,
} from "./types";

export type RoomInvite = {
  roomId: string;
  inviteToken: string;
  inviteExpiresAt?: string;
};

export type RoomSessionSnapshot = {
  active: boolean;
  startedAt: number | null;
};

export type RoomConnectionListener = {
  onChange: () => void;
  onEmote: (value: string, userId: string) => void;
  onStatus: (state: RoomConnectionState) => void;
};

export type RoomTransport = {
  getSession(): Promise<string | null>;
  signInAnonymously(): Promise<string>;
  rpc<T>(name: "create_room" | "join_room", args: Record<string, string>): Promise<T>;
  members(roomId: string): Promise<RoomMember[]>;
  updateMember(roomId: string, userId: string, patch: Record<string, unknown>): Promise<void>;
  subscribe(topic: string, listener: RoomConnectionListener): () => void;
  broadcast(
    topic: string,
    event: "emote",
    payload: { value: string; userId: string },
  ): Promise<void>;
};

export type RoomApi = Pick<
  RoomClient,
  | "ensureAnonymousSession"
  | "createRoom"
  | "joinRoom"
  | "loadMembers"
  | "saveProfile"
  | "sendHeartbeat"
  | "subscribe"
  | "sendEmote"
>;

type CreateRoomRow = {
  room_id: string;
  invite_token: string;
  invite_expires_at: string;
};

type MemberRow = {
  room_id: string;
  user_id: string;
  display_name: string;
  species: RoomMember["species"];
  intro: string;
  active: boolean;
  started_at: string | null;
  last_seen_at: string;
};

function roomTopic(roomId: string) {
  return `room:${roomId}`;
}

function profileArgs(profile: GuestProfile) {
  return {
    p_display_name: normalizeDisplayName(profile.displayName),
    p_species: profile.species,
    p_intro: normalizeIntro(profile.intro),
  };
}

function toRoomMember(row: MemberRow): RoomMember {
  return {
    roomId: row.room_id,
    userId: row.user_id,
    displayName: row.display_name,
    species: row.species,
    intro: row.intro,
    active: row.active,
    startedAt: row.started_at ? Date.parse(row.started_at) : null,
    lastSeenAt: Date.parse(row.last_seen_at),
  };
}

export class RoomClient {
  private userId: string | null = null;

  constructor(private readonly transport: RoomTransport) {}

  async ensureAnonymousSession() {
    if (this.userId) return this.userId;
    this.userId = (await this.transport.getSession()) ?? (await this.transport.signInAnonymously());
    return this.userId;
  }

  async createRoom(profile: GuestProfile): Promise<RoomInvite> {
    await this.ensureAnonymousSession();
    const result = await this.transport.rpc<CreateRoomRow[] | CreateRoomRow>(
      "create_room",
      profileArgs(profile),
    );
    const room = Array.isArray(result) ? result[0] : result;
    if (!room?.room_id || !room.invite_token || !room.invite_expires_at) {
      throw new Error("invalid_room_response");
    }
    return {
      roomId: room.room_id,
      inviteToken: room.invite_token,
      inviteExpiresAt: room.invite_expires_at,
    };
  }

  async joinRoom(inviteInput: string, profile: GuestProfile) {
    const inviteToken = parseInviteToken(inviteInput);
    if (!inviteToken) throw new Error("invalid_invite");

    await this.ensureAnonymousSession();
    const result = await this.transport.rpc<string | { join_room: string }>("join_room", {
      p_invite_token: inviteToken,
      ...profileArgs(profile),
    });
    const roomId = typeof result === "string" ? result : result.join_room;
    if (!roomId) throw new Error("invalid_room_response");
    return roomId;
  }

  async loadMembers(roomId: string) {
    await this.ensureAnonymousSession();
    return this.transport.members(roomId);
  }

  async saveProfile(roomId: string, profile: GuestProfile) {
    const userId = await this.ensureAnonymousSession();
    await this.transport.updateMember(roomId, userId, {
      display_name: normalizeDisplayName(profile.displayName),
      species: profile.species,
      intro: normalizeIntro(profile.intro),
    });
  }

  async sendHeartbeat(roomId: string, session: RoomSessionSnapshot) {
    const userId = await this.ensureAnonymousSession();
    await this.transport.updateMember(roomId, userId, {
      active: session.active,
      started_at: session.active && session.startedAt ? new Date(session.startedAt * 1000).toISOString() : null,
      last_seen_at: new Date().toISOString(),
    });
  }

  subscribe(roomId: string, listener: RoomConnectionListener) {
    return this.transport.subscribe(roomTopic(roomId), listener);
  }

  async sendEmote(roomId: string, value: string) {
    const userId = await this.ensureAnonymousSession();
    await this.transport.broadcast(roomTopic(roomId), "emote", { value, userId });
  }
}

class SupabaseRoomTransport implements RoomTransport {
  private readonly channels = new Map<string, RealtimeChannel>();

  constructor(private readonly client: SupabaseClient) {}

  async getSession() {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    return data.session?.user.id ?? null;
  }

  async signInAnonymously() {
    const { data, error } = await this.client.auth.signInAnonymously();
    if (error) throw error;
    if (!data.user) throw new Error("anonymous_sign_in_failed");
    return data.user.id;
  }

  async rpc<T>(name: "create_room" | "join_room", args: Record<string, string>) {
    const { data, error } = await this.client.rpc(name, args);
    if (error) throw error;
    return data as T;
  }

  async members(roomId: string) {
    const { data, error } = await this.client
      .from("room_members")
      .select("room_id,user_id,display_name,species,intro,active,started_at,last_seen_at")
      .eq("room_id", roomId)
      .order("joined_at");
    if (error) throw error;
    return (data as MemberRow[]).map(toRoomMember);
  }

  async updateMember(roomId: string, userId: string, patch: Record<string, unknown>) {
    const { error } = await this.client
      .from("room_members")
      .update(patch)
      .eq("room_id", roomId)
      .eq("user_id", userId);
    if (error) throw error;
  }

  subscribe(topic: string, listener: RoomConnectionListener) {
    const channel = this.client
      .channel(topic, { config: { private: true } })
      .on("broadcast", { event: "INSERT" }, listener.onChange)
      .on("broadcast", { event: "UPDATE" }, listener.onChange)
      .on("broadcast", { event: "emote" }, ({ payload }) => {
        if (
          typeof payload === "object" &&
          payload !== null &&
          typeof payload.value === "string" &&
          typeof payload.userId === "string"
        ) {
          listener.onEmote(payload.value, payload.userId);
        }
      });

    this.channels.set(topic, channel);
    void this.client.auth.getSession().then(({ data }) =>
      this.client.realtime.setAuth(data.session?.access_token ?? null),
    ).then(() => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") listener.onStatus("connected");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          listener.onStatus("reconnecting");
        }
      });
    }).catch(() => listener.onStatus("error"));

    return () => {
      if (this.channels.get(topic) === channel) this.channels.delete(topic);
      void this.client.removeChannel(channel);
    };
  }

  async broadcast(
    topic: string,
    event: "emote",
    payload: { value: string; userId: string },
  ) {
    const channel = this.channels.get(topic);
    if (!channel) throw new Error("room_channel_unavailable");
    const status = await channel.send({ type: "broadcast", event, payload });
    if (status !== "ok") throw new Error("room_broadcast_failed");
  }
}

export function createRoomClient() {
  return supabase ? new RoomClient(new SupabaseRoomTransport(supabase)) : null;
}
