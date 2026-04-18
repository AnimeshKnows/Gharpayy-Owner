import type { Request, Response } from "express";
import type { Types } from "mongoose";
import { Room } from "../models/Room";
import { inventorySortWeight, roomWithProperty } from "../lib/wire";

export async function inventory(req: Request, res: Response): Promise<void> {
  try {
    const location = req.query.location as string | undefined;
    const controlType = req.query.controlType as string | undefined;

    const match: Record<string, unknown> = {
      status: { $in: ["vacant", "vacating"] },
    };
    if (controlType && ["open", "requested", "dedicated"].includes(controlType)) {
      match.controlType = controlType;
    }

    const rooms = await Room.find(match)
      .populate("property", "name location")
      .lean()
      .exec();

    let list = rooms.map((r) => {
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
        sortKey: inventorySortWeight({
          controlType: r.controlType,
          blockStatus: r.blockStatus,
        }),
      };
    });

    if (location) {
      const q = location.toLowerCase();
      list = list.filter((x) =>
        String((x.wire.propertyLocation as string) ?? "").toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => a.sortKey - b.sortKey);
    res.json(list.map((x) => x.wire));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
