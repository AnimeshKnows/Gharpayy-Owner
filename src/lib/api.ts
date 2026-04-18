// Typed API client. Hits VITE_API_URL when set, falls back to in-memory mock.
// All endpoints + payloads are documented in API_CONTRACT.md.

import type {
  ActionLogWithRoom,
  BlockRequestWithRoom,
  Property,
  Role,
  RoomWithProperty,
  User,
} from "@/types/models";
import { mockDb } from "./mockDb";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
const USE_MOCK = !API_URL;

const TOKEN_KEY = "gharpayy.token";
const USER_KEY = "gharpayy.user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function setSession(token: string, user: User) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// --- Auth ---
export const api = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    if (USE_MOCK) {
      const u = mockDb.findUserByEmail(email);
      if (!u || u.passwordHash !== password) {
        throw new Error("Invalid email or password");
      }
      const user = mockDb.publicUser(u);
      const token = `mock.${u._id}.${Date.now()}`;
      setSession(token, user);
      return { token, user };
    }
    const out = await http<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setSession(out.token, out.user);
    return out;
  },

  logout() {
    clearSession();
  },

  async me(): Promise<User | null> {
    if (USE_MOCK) return getStoredUser();
    if (!getToken()) return null;
    return http<User>("/api/auth/me");
  },

  // --- Owner endpoints ---
  async ownerProperties(ownerId: string): Promise<Property[]> {
    if (USE_MOCK) {
      return mockDb.properties.filter((p) => p.owner === ownerId);
    }
    return http<Property[]>(`/api/owner/${ownerId}/properties`);
  },

  async ownerRooms(ownerId: string, propertyId?: string): Promise<RoomWithProperty[]> {
    if (USE_MOCK) {
      const props = mockDb.properties.filter((p) => p.owner === ownerId);
      const propIds = new Set(props.map((p) => p._id));
      return mockDb.rooms
        .filter((r) => propIds.has(r.property))
        .filter((r) => (propertyId ? r.property === propertyId : true))
        .map(mockDb.joinRoom);
    }
    const q = propertyId ? `?propertyId=${propertyId}` : "";
    return http<RoomWithProperty[]>(`/api/owner/${ownerId}/rooms${q}`);
  },

  async ownerPendingBlockRequests(ownerId: string): Promise<BlockRequestWithRoom[]> {
    if (USE_MOCK) {
      const props = mockDb.properties.filter((p) => p.owner === ownerId);
      const propIds = new Set(props.map((p) => p._id));
      const ownerRoomIds = new Set(
        mockDb.rooms.filter((r) => propIds.has(r.property)).map((r) => r._id),
      );
      return mockDb.blockRequests
        .filter((b) => b.status === "pending" && ownerRoomIds.has(b.room))
        .map(mockDb.joinBlockRequest);
    }
    return http<BlockRequestWithRoom[]>(
      `/api/owner/${ownerId}/block-requests?status=pending`,
    );
  },

  async ownerEffortFeed(ownerId: string, limit = 20): Promise<ActionLogWithRoom[]> {
    if (USE_MOCK) {
      const props = mockDb.properties.filter((p) => p.owner === ownerId);
      const propIds = new Set(props.map((p) => p._id));
      const ownerRoomIds = new Set(
        mockDb.rooms.filter((r) => propIds.has(r.property)).map((r) => r._id),
      );
      return [...mockDb.actionLogs]
        .filter((a) => ownerRoomIds.has(a.room))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, limit)
        .map(mockDb.joinActionLog);
    }
    return http<ActionLogWithRoom[]>(
      `/api/owner/${ownerId}/effort-feed?limit=${limit}`,
    );
  },

  // --- Sales endpoints ---
  // Returns rooms that pass the "no owner confirmation, no selling" rule:
  // status must be "vacant" or "vacating".
  async salesInventory(filters?: {
    location?: string;
    controlType?: "open" | "requested" | "dedicated";
  }): Promise<RoomWithProperty[]> {
    if (USE_MOCK) {
      let list = mockDb.rooms
        .filter((r) => r.status === "vacant" || r.status === "vacating")
        .map(mockDb.joinRoom);
      if (filters?.location) {
        list = list.filter((r) =>
          r.propertyLocation
            .toLowerCase()
            .includes(filters.location!.toLowerCase()),
        );
      }
      if (filters?.controlType) {
        list = list.filter((r) => r.controlType === filters.controlType);
      }
      // Priority stack: dedicated > approved blocks > fresh vacant
      const weight = (r: RoomWithProperty) => {
        if (r.controlType === "dedicated") return 0;
        if (r.blockStatus === "approved") return 1;
        return 2;
      };
      list.sort((a, b) => weight(a) - weight(b));
      return list;
    }
    const q = new URLSearchParams();
    if (filters?.location) q.set("location", filters.location);
    if (filters?.controlType) q.set("controlType", filters.controlType);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return http<RoomWithProperty[]>(`/api/sales/inventory${qs}`);
  },
};

export const authConfig = {
  usingMock: USE_MOCK,
  apiUrl: API_URL || "(in-memory mock)",
};

export type { Role };
