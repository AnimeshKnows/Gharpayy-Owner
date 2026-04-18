// Mirrors the Mongoose models documented in API_CONTRACT.md
// All ids are strings on the wire (Mongo ObjectId.toString()).

export type Role = "owner" | "sales" | "admin";

export interface User {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: Role;
}

export interface Property {
  _id: string;
  name: string;
  location: string;
  owner: string; // Owner _id
}

export type RoomStatus =
  | "occupied"
  | "vacating"
  | "vacant"
  | "blocked"
  | "reserved";

export type ControlType = "open" | "requested" | "dedicated";
export type BlockStatus = "none" | "pending" | "approved" | "rejected";

export interface Room {
  _id: string;
  property: string; // Property _id
  roomNumber: string;
  beds: number;
  actualRent: number;
  expectedRent: number;
  floorPrice?: number;
  status: RoomStatus;
  controlType: ControlType;
  blockStatus: BlockStatus;
  lockedUntil?: string; // ISO
  vacatingDate?: string; // ISO
}

export interface BlockRequest {
  _id: string;
  room: string;
  requestedBy: string; // sales user _id
  requestTime: string;
  expiryTime: string;
  status: "pending" | "approved" | "rejected";
  ownerResponseTime?: string;
}

export type ActionType =
  | "pitch"
  | "virtual_tour"
  | "visit_scheduled"
  | "visit_done"
  | "booking";

export interface ActionLog {
  _id: string;
  room: string;
  actionType: ActionType;
  salesUser: string;
  timestamp: string;
  notes?: string;
}

export interface Visit {
  _id: string;
  room: string;
  customerName: string;
  customerPhone?: string;
  visitType: "virtual" | "physical";
  scheduledTime: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  createdBy: string;
}

export interface Allocation {
  _id: string;
  property: string;
  owner: string;
  allocatedRoomsCount: number;
  allocatedBedsCount: number;
  minCommitment: number;
  active: boolean;
}

export interface Violation {
  _id: string;
  room: string;
  owner: string;
  type: string;
  description: string;
  timestamp: string;
}

// Joined / view-model shapes returned by some endpoints
export interface RoomWithProperty extends Room {
  propertyName: string;
  propertyLocation: string;
}

export interface BlockRequestWithRoom extends BlockRequest {
  roomNumber: string;
  propertyName: string;
  salesUserName: string;
}

export interface ActionLogWithRoom extends ActionLog {
  roomNumber: string;
  propertyName: string;
  salesUserName: string;
}
