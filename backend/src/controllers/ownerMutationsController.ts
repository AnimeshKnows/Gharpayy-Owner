import type { Request, Response } from "express";
import type { Types } from "mongoose";
import { Room } from "../models/Room";
import { BlockRequest } from "../models/BlockRequest";
import { Property } from "../models/Property";
import { Violation } from "../models/Violation";
import { idStr } from "../lib/wire";
import { serializeRoomWithProperty } from "../lib/serializeRoom";
import { syncAllocationForProperty } from "../lib/allocationSync";
import {
  maybeViolationDedicatedOff,
  maybeViolationStatusChange,
} from "../lib/violationLog";

const ALLOWED_OWNER_STATUS = new Set(["vacant", "vacating", "occupied"]);

async function loadOwnedRoom(ownerId: string, roomId: string) {
  const room = await Room.findById(roomId).populate("property", "owner").exec();
  if (!room) return null;
  const prop = room.property as unknown as { owner: Types.ObjectId };
  if (idStr(prop.owner) !== ownerId) return null;
  return room;
}

export async function patchRoomStatus(req: Request, res: Response): Promise<void> {
  try {
    const { ownerId, roomId } = req.params;
    const { status, vacatingDate } = req.body as {
      status?: string;
      vacatingDate?: string;
    };
    if (!status || !ALLOWED_OWNER_STATUS.has(status)) {
      res.status(400).json({ error: "status must be vacant, vacating, or occupied" });
      return;
    }
    const room = await loadOwnedRoom(ownerId, roomId);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    const beforeDedicated = room.controlType === "dedicated";
    const beforeBlockApproved = room.blockStatus === "approved";
    await maybeViolationStatusChange({
      beforeDedicated,
      beforeBlockApproved,
      newStatus: status,
      roomId: room._id,
      ownerId,
    });

    room.status = status as typeof room.status;
    if (status === "vacating" && vacatingDate) {
      room.vacatingDate = new Date(vacatingDate);
    } else if (status !== "vacating") {
      room.vacatingDate = undefined;
    }
    await room.save();
    const out = await serializeRoomWithProperty(roomId);
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function patchRoomDedicated(req: Request, res: Response): Promise<void> {
  try {
    const { ownerId, roomId } = req.params;
    const { dedicated } = req.body as { dedicated?: boolean };
    if (typeof dedicated !== "boolean") {
      res.status(400).json({ error: "dedicated boolean required" });
      return;
    }
    const room = await loadOwnedRoom(ownerId, roomId);
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    const beforeDedicated = room.controlType === "dedicated";
    const beforeBlockApproved = room.blockStatus === "approved";

    await maybeViolationDedicatedOff({
      beforeDedicated,
      beforeBlockApproved,
      newDedicated: dedicated,
      roomId: room._id,
      ownerId,
    });

    if (dedicated) {
      room.controlType = "dedicated";
    } else {
      if (room.blockStatus === "pending" || room.blockStatus === "approved") {
        room.controlType = "requested";
      } else {
        room.controlType = "open";
      }
    }
    await room.save();
    await syncAllocationForProperty(room.property as Types.ObjectId);
    const out = await serializeRoomWithProperty(roomId);
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function respondBlockRequest(req: Request, res: Response): Promise<void> {
  try {
    const { ownerId, requestId } = req.params;
    const { action } = req.body as { action?: string };
    if (action !== "approve" && action !== "reject") {
      res.status(400).json({ error: 'action must be "approve" or "reject"' });
      return;
    }
    const br = await BlockRequest.findById(requestId).exec();
    if (!br) {
      res.status(404).json({ error: "Block request not found" });
      return;
    }
    const propIds = await Property.find({ owner: ownerId }).distinct("_id").exec();
    const ownedRoomIds = await Room.find({ property: { $in: propIds } }).distinct("_id").exec();
    if (!ownedRoomIds.some((id) => idStr(id) === idStr(br.room as Types.ObjectId))) {
      res.status(404).json({ error: "Block request not found" });
      return;
    }
    if (br.status !== "pending") {
      res.status(400).json({ error: "Request is not pending" });
      return;
    }

    const room = await Room.findById(br.room).exec();
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }

    const now = new Date();
    br.ownerResponseTime = now;

    if (action === "approve") {
      br.status = "approved";
      room.blockStatus = "approved";
      room.lockedUntil = br.expiryTime;
      if (room.controlType !== "dedicated") {
        room.controlType = "requested";
      }
    } else {
      br.status = "rejected";
      room.blockStatus = "rejected";
    }
    await br.save();
    await room.save();

    const blockWire: Record<string, unknown> = {
      _id: idStr(br._id),
      room: idStr(br.room as Types.ObjectId),
      requestedBy: idStr(br.requestedBy as Types.ObjectId),
      requestTime: br.requestTime.toISOString(),
      expiryTime: br.expiryTime.toISOString(),
      status: br.status,
      ownerResponseTime: br.ownerResponseTime.toISOString(),
    };
    const roomWire = await serializeRoomWithProperty(idStr(room._id));
    res.json({ blockRequest: blockWire, room: roomWire });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function listViolations(req: Request, res: Response): Promise<void> {
  try {
    const { ownerId } = req.params;
    const rows = await Violation.find({ owner: ownerId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean()
      .exec();
    res.json(
      rows.map((v) => ({
        _id: idStr(v._id as Types.ObjectId),
        room: idStr(v.room as Types.ObjectId),
        owner: idStr(v.owner as Types.ObjectId),
        type: v.type,
        description: v.description,
        timestamp: (v.timestamp as Date).toISOString(),
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
