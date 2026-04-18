// In-memory mock database used when VITE_API_URL is not set.
// Mirrors the REST contract documented in API_CONTRACT.md so swapping
// to the real Express+Mongo backend is just an env var change.

import type {
  ActionLog,
  ActionLogWithRoom,
  Allocation,
  BlockRequest,
  BlockRequestWithRoom,
  Property,
  Room,
  RoomWithProperty,
  User,
  Violation,
  Visit,
} from "@/types/models";

const id = (() => {
  let n = 1;
  return () => `mock_${(n++).toString(36).padStart(6, "0")}`;
})();

const now = () => new Date().toISOString();
const minutesFromNow = (m: number) =>
  new Date(Date.now() + m * 60_000).toISOString();
const minutesAgo = (m: number) =>
  new Date(Date.now() - m * 60_000).toISOString();

// --- Seeded users (passwords are mock-only; real auth is server-side) ---
const ownerUser: User & { passwordHash: string } = {
  _id: id(),
  name: "Demo Owner",
  phone: "+91-9000000001",
  email: "owner@demo.test",
  role: "owner",
  passwordHash: "Demo1234!",
};
const salesUser: User & { passwordHash: string } = {
  _id: id(),
  name: "Demo Sales",
  phone: "+91-9000000002",
  email: "sales@demo.test",
  role: "sales",
  passwordHash: "Demo1234!",
};
const adminUser: User & { passwordHash: string } = {
  _id: id(),
  name: "Demo Admin",
  phone: "+91-9000000003",
  email: "admin@demo.test",
  role: "admin",
  passwordHash: "Demo1234!",
};

const users = [ownerUser, salesUser, adminUser];

// --- Property + rooms ---
const property: Property = {
  _id: id(),
  name: "Gharpayy Indiranagar House 1",
  location: "Indiranagar, Bengaluru",
  owner: ownerUser._id,
};

const rooms: Room[] = [
  {
    _id: id(),
    property: property._id,
    roomNumber: "101",
    beds: 2,
    actualRent: 14000,
    expectedRent: 15000,
    floorPrice: 13000,
    status: "vacant",
    controlType: "dedicated",
    blockStatus: "none",
  },
  {
    _id: id(),
    property: property._id,
    roomNumber: "102",
    beds: 1,
    actualRent: 11000,
    expectedRent: 12000,
    status: "vacating",
    controlType: "requested",
    blockStatus: "approved",
    lockedUntil: minutesFromNow(60 * 24),
    vacatingDate: minutesFromNow(60 * 24 * 7),
  },
  {
    _id: id(),
    property: property._id,
    roomNumber: "103",
    beds: 2,
    actualRent: 13500,
    expectedRent: 14000,
    status: "occupied",
    controlType: "open",
    blockStatus: "none",
  },
];

const allocations: Allocation[] = [
  {
    _id: id(),
    property: property._id,
    owner: ownerUser._id,
    allocatedRoomsCount: 1,
    allocatedBedsCount: 2,
    minCommitment: 1,
    active: true,
  },
];

const blockRequests: BlockRequest[] = [
  {
    _id: id(),
    room: rooms[0]._id,
    requestedBy: salesUser._id,
    requestTime: minutesAgo(45),
    expiryTime: minutesFromNow(60 * 12),
    status: "pending",
  },
];

const actionLogs: ActionLog[] = [
  {
    _id: id(),
    room: rooms[0]._id,
    actionType: "pitch",
    salesUser: salesUser._id,
    timestamp: minutesAgo(120),
    notes: "Pitched to 2 leads from Justdial",
  },
  {
    _id: id(),
    room: rooms[0]._id,
    actionType: "virtual_tour",
    salesUser: salesUser._id,
    timestamp: minutesAgo(80),
  },
  {
    _id: id(),
    room: rooms[1]._id,
    actionType: "visit_scheduled",
    salesUser: salesUser._id,
    timestamp: minutesAgo(30),
    notes: "Customer Riya, tomorrow 5pm",
  },
];

const visits: Visit[] = [];
const violations: Violation[] = [];
const properties: Property[] = [property];

// --- Helpers used by the API client ---
function findUserByEmail(email: string) {
  return users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
}

function publicUser(u: User & { passwordHash: string }): User {
  const { passwordHash: _ph, ...rest } = u;
  return rest;
}

function joinRoom(r: Room): RoomWithProperty {
  const p = properties.find((x) => x._id === r.property)!;
  return {
    ...r,
    propertyName: p.name,
    propertyLocation: p.location,
  };
}

function joinBlockRequest(b: BlockRequest): BlockRequestWithRoom {
  const r = rooms.find((x) => x._id === b.room)!;
  const p = properties.find((x) => x._id === r.property)!;
  const s = users.find((x) => x._id === b.requestedBy)!;
  return {
    ...b,
    roomNumber: r.roomNumber,
    propertyName: p.name,
    salesUserName: s.name,
  };
}

function joinActionLog(a: ActionLog): ActionLogWithRoom {
  const r = rooms.find((x) => x._id === a.room)!;
  const p = properties.find((x) => x._id === r.property)!;
  const s = users.find((x) => x._id === a.salesUser)!;
  return {
    ...a,
    roomNumber: r.roomNumber,
    propertyName: p.name,
    salesUserName: s.name,
  };
}

export const mockDb = {
  users,
  properties,
  rooms,
  allocations,
  blockRequests,
  actionLogs,
  visits,
  violations,
  findUserByEmail,
  publicUser,
  joinRoom,
  joinBlockRequest,
  joinActionLog,
};
