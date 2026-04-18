import type { Request, Response } from "express";
import type { Types } from "mongoose";
import { Room } from "../models/Room";
import { Property } from "../models/Property";
import { inventorySortWeight, roomWithProperty } from "../lib/wire";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Gharpayy sellable / pipeline-visible inventory for sales. */
function sellableRoomMatch(): Record<string, unknown> {
  return {
    $or: [
      { status: { $in: ["vacant", "vacating"] } },
      {
        status: "reserved",
        $or: [{ controlType: "dedicated" }, { blockStatus: "approved" }],
      },
    ],
  };
}

export async function inventory(req: Request, res: Response): Promise<void> {
  try {
    const location = (req.query.location as string | undefined)?.trim();
    const controlType = req.query.controlType as string | undefined;

    const andParts: Record<string, unknown>[] = [sellableRoomMatch()];

    if (controlType && ["open", "requested", "dedicated"].includes(controlType)) {
      andParts.push({ controlType });
    }

    if (location) {
      const props = await Property.find({
        location: { $regex: escapeRegex(location), $options: "i" },
      })
        .select("_id")
        .lean()
        .exec();
      const ids = props.map((p) => p._id);
      if (ids.length === 0) {
        res.json([]);
        return;
      }
      andParts.push({ property: { $in: ids } });
    }

    const match = andParts.length === 1 ? andParts[0] : { $and: andParts };

    const rooms = await Room.find(match)
      .populate("property", "name location")
      .lean()
      .exec();

    type Row = {
      wire: Record<string, unknown>;
      propName: string;
      roomNumber: string;
    };

    const list: Row[] = rooms.map((r) => {
      const prop = r.property as unknown as {
        _id: Types.ObjectId;
        name: string;
        location: string;
      };
      return {
        wire: roomWithProperty(
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
        ),
        propName: prop.name,
        roomNumber: r.roomNumber,
      };
    });

    list.sort((a, b) => {
      const wa = inventorySortWeight({
        controlType: a.wire.controlType as string,
        blockStatus: a.wire.blockStatus as string,
      });
      const wb = inventorySortWeight({
        controlType: b.wire.controlType as string,
        blockStatus: b.wire.blockStatus as string,
      });
      if (wa !== wb) return wa - wb;
      const byName = a.propName.localeCompare(b.propName, undefined, { sensitivity: "base" });
      if (byName !== 0) return byName;
      return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
    });

    res.json(list.map((x) => x.wire));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
