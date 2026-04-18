import type { Types } from "mongoose";
import { Room } from "../models/Room";
import { roomWithProperty } from "./wire";

export async function serializeRoomWithProperty(
  roomId: string,
): Promise<Record<string, unknown> | null> {
  const r = await Room.findById(roomId).populate("property", "name location").lean().exec();
  if (!r) return null;
  const prop = r.property as unknown as {
    _id: Types.ObjectId;
    name: string;
    location: string;
  };
  return roomWithProperty(
    {
      _id: r._id as Types.ObjectId,
      property: prop._id,
      roomNumber: r.roomNumber,
      beds: r.beds,
      actualRent: r.actualRent,
      expectedRent: r.expectedRent,
      floorPrice: r.floorPrice,
      status: r.status,
      controlType: r.controlType,
      blockStatus: r.blockStatus,
      lockedUntil: r.lockedUntil,
      vacatingDate: r.vacatingDate,
    },
    { name: prop.name, location: prop.location },
  );
}
