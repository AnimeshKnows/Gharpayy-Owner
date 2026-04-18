import type { Types } from "mongoose";
import { Room } from "../models/Room";
import { Property } from "../models/Property";
import { Allocation } from "../models/Allocation";

/** Recompute dedicated counts for a property and upsert Allocation row. */
export async function syncAllocationForProperty(propertyId: Types.ObjectId | string): Promise<void> {
  const prop = await Property.findById(propertyId).lean().exec();
  if (!prop) return;
  const ownerId = prop.owner as Types.ObjectId;
  const dedicated = await Room.find({
    property: propertyId,
    controlType: "dedicated",
  })
    .lean()
    .exec();
  const allocatedRoomsCount = dedicated.length;
  const allocatedBedsCount = dedicated.reduce((s, r) => s + (r.beds ?? 0), 0);
  await Allocation.findOneAndUpdate(
    { property: propertyId, owner: ownerId },
    {
      $set: {
        property: propertyId,
        owner: ownerId,
        allocatedRoomsCount,
        allocatedBedsCount,
        active: allocatedRoomsCount > 0,
      },
    },
    { upsert: true, new: true },
  ).exec();
}
