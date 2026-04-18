import type { Request, Response } from "express";
import type { Types } from "mongoose";
import { Property } from "../models/Property";
import { Room } from "../models/Room";
import { BlockRequest } from "../models/BlockRequest";
import { ActionLog } from "../models/ActionLog";
import { idStr, roomWithProperty } from "../lib/wire";

async function propertyIdsForOwner(ownerId: string): Promise<Types.ObjectId[]> {
  const props = await Property.find({ owner: ownerId }).select("_id").lean().exec();
  return props.map((p) => p._id as Types.ObjectId);
}

async function roomIdsForOwner(ownerId: string): Promise<Types.ObjectId[]> {
  const propIds = await propertyIdsForOwner(ownerId);
  if (propIds.length === 0) return [];
  const rooms = await Room.find({ property: { $in: propIds } }).select("_id").lean().exec();
  return rooms.map((r) => r._id as Types.ObjectId);
}

export async function listProperties(req: Request, res: Response): Promise<void> {
  try {
    const { ownerId } = req.params;
    const props = await Property.find({ owner: ownerId }).lean().exec();
    res.json(
      props.map((p) => ({
        _id: idStr(p._id),
        name: p.name,
        location: p.location,
        owner: idStr(p.owner as Types.ObjectId),
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function listRooms(req: Request, res: Response): Promise<void> {
  try {
    const { ownerId } = req.params;
    const propertyId = req.query.propertyId as string | undefined;

    const ownerProps = await Property.find({ owner: ownerId }).select("_id").lean().exec();
    const propIds = ownerProps.map((p) => p._id as Types.ObjectId);
    if (propIds.length === 0) {
      res.json([]);
      return;
    }

    let filterPropIds = propIds;
    if (propertyId) {
      const allowed = ownerProps.some((p) => idStr(p._id) === propertyId);
      if (!allowed) {
        res.status(400).json({ error: "Invalid propertyId for this owner" });
        return;
      }
      filterPropIds = propIds.filter((id) => idStr(id) === propertyId);
    }

    const rooms = await Room.find({ property: { $in: filterPropIds } })
      .populate("property", "name location")
      .lean()
      .exec();

    const out = rooms.map((r) => {
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
    });
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function listBlockRequests(req: Request, res: Response): Promise<void> {
  try {
    const { ownerId } = req.params;
    const status = req.query.status as string | undefined;

    const roomIds = await roomIdsForOwner(ownerId);
    if (roomIds.length === 0) {
      res.json([]);
      return;
    }

    const q: Record<string, unknown> = { room: { $in: roomIds } };
    if (status === "pending") {
      q.status = "pending";
    }

    const rows = await BlockRequest.find(q)
      .populate({
        path: "room",
        select: "roomNumber property",
        populate: { path: "property", select: "name location" },
      })
      .populate("requestedBy", "name")
      .sort({ requestTime: -1 })
      .lean()
      .exec();

    const out = rows
      .filter((b) => b.room && typeof b.room === "object")
      .map((b) => {
        const room = b.room as unknown as {
          _id: Types.ObjectId;
          roomNumber: string;
          property: { name: string };
        };
        const sales = b.requestedBy as unknown as { _id: Types.ObjectId; name: string };
        const base: Record<string, unknown> = {
          _id: idStr(b._id as Types.ObjectId),
          room: idStr(room._id),
          requestedBy: idStr(sales._id),
          requestTime: (b.requestTime as Date).toISOString(),
          expiryTime: (b.expiryTime as Date).toISOString(),
          status: b.status,
          roomNumber: room.roomNumber,
          propertyName: room.property.name,
          salesUserName: sales.name,
        };
        if (b.ownerResponseTime) {
          base.ownerResponseTime = (b.ownerResponseTime as Date).toISOString();
        }
        return base;
      });
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function effortFeed(req: Request, res: Response): Promise<void> {
  try {
    const { ownerId } = req.params;
    const limitRaw = req.query.limit as string | undefined;
    const limit = Math.min(Math.max(parseInt(limitRaw ?? "20", 10) || 20, 1), 100);

    const roomIds = await roomIdsForOwner(ownerId);
    if (roomIds.length === 0) {
      res.json([]);
      return;
    }

    const rows = await ActionLog.find({ room: { $in: roomIds } })
      .populate({
        path: "room",
        select: "roomNumber property",
        populate: { path: "property", select: "name location" },
      })
      .populate("salesUser", "name")
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec();

    const out = rows
      .filter((a) => a.room && typeof a.room === "object")
      .map((a) => {
        const room = a.room as unknown as {
          _id: Types.ObjectId;
          roomNumber: string;
          property: { name: string };
        };
        const sales = a.salesUser as unknown as { _id: Types.ObjectId; name: string };
        const base: Record<string, unknown> = {
          _id: idStr(a._id as Types.ObjectId),
          room: idStr(room._id),
          actionType: a.actionType,
          salesUser: idStr(sales._id),
          timestamp: (a.timestamp as Date).toISOString(),
          roomNumber: room.roomNumber,
          propertyName: room.property.name,
          salesUserName: sales.name,
        };
        if (a.notes) base.notes = a.notes;
        return base;
      });
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
