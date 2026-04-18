// Typed API client. Hits VITE_API_URL when set, falls back to in-memory mock.
// All endpoints + payloads are documented in API_CONTRACT.md.

import type {
  ActionLog,
  ActionLogWithRoom,
  BlockRequest,
  BlockRequestWithRoom,
  Property,
  Role,
  RoomWithProperty,
  User,
  Visit,
  Violation,
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

  async ownerViolations(ownerId: string): Promise<Violation[]> {
    if (USE_MOCK) {
      throw new Error("Owner violations require VITE_API_URL (mock mode does not support this).");
    }
    return http<Violation[]>(`/api/owner/${ownerId}/violations`);
  },

  async ownerUpdateRoomStatus(
    ownerId: string,
    roomId: string,
    body: { status: "vacant" | "vacating" | "occupied"; vacatingDate?: string },
  ): Promise<RoomWithProperty> {
    if (USE_MOCK) {
      throw new Error("Room updates require VITE_API_URL (mock mode does not support this).");
    }
    return http<RoomWithProperty>(`/api/owner/${ownerId}/rooms/${roomId}/status`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  async ownerToggleDedicated(
    ownerId: string,
    roomId: string,
    dedicated: boolean,
  ): Promise<RoomWithProperty> {
    if (USE_MOCK) {
      throw new Error("Dedicated toggle requires VITE_API_URL (mock mode does not support this).");
    }
    return http<RoomWithProperty>(`/api/owner/${ownerId}/rooms/${roomId}/dedicated`, {
      method: "PATCH",
      body: JSON.stringify({ dedicated }),
    });
  },

  async ownerRespondBlockRequest(
    ownerId: string,
    requestId: string,
    body: { action: "approve" | "reject" },
  ): Promise<{ blockRequest: BlockRequest; room: RoomWithProperty }> {
    if (USE_MOCK) {
      throw new Error("Block response requires VITE_API_URL (mock mode does not support this).");
    }
    return http<{ blockRequest: BlockRequest; room: RoomWithProperty }>(
      `/api/owner/${ownerId}/block-requests/${requestId}/respond`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  // --- Sales endpoints ---
  // Mirrors backend: vacant/vacating, or reserved via dedicated/approved path;
  // location on property.location; sort dedicated > approved block > rest, then name/room.
  async salesInventory(filters?: {
    location?: string;
    controlType?: "open" | "requested" | "dedicated";
  }): Promise<RoomWithProperty[]> {
    if (USE_MOCK) {
      let list = mockDb.rooms
        .filter((r) => {
          const vacantish = r.status === "vacant" || r.status === "vacating";
          const reservedPipeline =
            r.status === "reserved" &&
            (r.controlType === "dedicated" || r.blockStatus === "approved");
          return vacantish || reservedPipeline;
        })
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
      const weight = (r: RoomWithProperty) => {
        if (r.controlType === "dedicated") return 0;
        if (r.blockStatus === "approved") return 1;
        return 2;
      };
      list.sort((a, b) => {
        const w = weight(a) - weight(b);
        if (w !== 0) return w;
        const byName = a.propertyName.localeCompare(b.propertyName, undefined, {
          sensitivity: "base",
        });
        if (byName !== 0) return byName;
        return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
      });
      return list;
    }
    const q = new URLSearchParams();
    if (filters?.location) q.set("location", filters.location);
    if (filters?.controlType) q.set("controlType", filters.controlType);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return http<RoomWithProperty[]>(`/api/sales/inventory${qs}`);
  },

  async salesCreateBlockRequest(body: {
    roomId: string;
    expiryHours?: number;
  }): Promise<BlockRequest> {
    if (USE_MOCK) {
      throw new Error("Sales mutations require VITE_API_URL (mock mode does not support this).");
    }
    return http<BlockRequest>("/api/sales/block-requests", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async salesCreateVisit(body: {
    roomId: string;
    customerName: string;
    customerPhone?: string;
    visitType: "virtual" | "physical";
    scheduledTime: string;
  }): Promise<Visit> {
    if (USE_MOCK) {
      throw new Error("Sales mutations require VITE_API_URL (mock mode does not support this).");
    }
    return http<Visit>("/api/sales/visits", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async salesCreateActionLog(body: {
    roomId: string;
    actionType: "pitch" | "virtual_tour" | "visit_done" | "booking";
    notes?: string;
  }): Promise<{ actionLog: ActionLog; room?: RoomWithProperty }> {
    if (USE_MOCK) {
      throw new Error("Sales mutations require VITE_API_URL (mock mode does not support this).");
    }
    return http<{ actionLog: ActionLog; room?: RoomWithProperty }>("/api/sales/action-logs", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * Clears expired approved locks server-side. Call from cron or ops tooling only.
   * TODO(WhatsApp): no customer messaging here — keep sweep separate from outbound notifications.
   */
  async sweepLocks(internalKey: string): Promise<{ updated: number }> {
    if (USE_MOCK) {
      throw new Error("sweepLocks requires VITE_API_URL and INTERNAL_SWEEP_KEY on the server.");
    }
    return http<{ updated: number }>("/api/system/sweep-locks", {
      method: "POST",
      headers: { "x-internal-key": internalKey },
    });
  },
};

export const authConfig = {
  usingMock: USE_MOCK,
  apiUrl: API_URL || "(in-memory mock)",
};

export type { Role };
