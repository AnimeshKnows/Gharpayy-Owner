import type { Types } from "mongoose";

export function idStr(id: Types.ObjectId | string): string {
  return typeof id === "string" ? id : id.toString();
}

/** Room + property name/location for API JSON (ids as strings). */
export function roomWithProperty(
  room: {
    _id: Types.ObjectId;
    property: Types.ObjectId;
    roomNumber: string;
    beds: number;
    actualRent: number;
    expectedRent: number;
    floorPrice?: number;
    status: string;
    controlType: string;
    blockStatus: string;
    lockedUntil?: Date;
    vacatingDate?: Date;
  },
  property: { name: string; location: string },
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    _id: idStr(room._id),
    property: idStr(room.property),
    roomNumber: room.roomNumber,
    beds: room.beds,
    actualRent: room.actualRent,
    expectedRent: room.expectedRent,
    status: room.status,
    controlType: room.controlType,
    blockStatus: room.blockStatus,
    propertyName: property.name,
    propertyLocation: property.location,
  };
  if (room.floorPrice !== undefined) base.floorPrice = room.floorPrice;
  if (room.lockedUntil) base.lockedUntil = room.lockedUntil.toISOString();
  if (room.vacatingDate) base.vacatingDate = room.vacatingDate.toISOString();
  return base;
}

export function inventorySortWeight(r: { controlType: string; blockStatus: string }): number {
  if (r.controlType === "dedicated") return 0;
  if (r.blockStatus === "approved") return 1;
  return 2;
}
