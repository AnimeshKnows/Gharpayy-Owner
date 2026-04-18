import type { Request, Response } from "express";
import type { Types } from "mongoose";
import { Room } from "../models/Room";
import { BlockRequest } from "../models/BlockRequest";
import { ActionLog } from "../models/ActionLog";
import { Visit } from "../models/Visit";
import { idStr } from "../lib/wire";
import { serializeRoomWithProperty } from "../lib/serializeRoom";

function wireBlockRequest(b: {
  _id: Types.ObjectId;
  room: Types.ObjectId;
  requestedBy: Types.ObjectId;
  requestTime: Date;
  expiryTime: Date;
  status: string;
  ownerResponseTime?: Date;
}): Record<string, unknown> {
  const out: Record<string, unknown> = {
    _id: idStr(b._id),
    room: idStr(b.room),
    requestedBy: idStr(b.requestedBy),
    requestTime: b.requestTime.toISOString(),
    expiryTime: b.expiryTime.toISOString(),
    status: b.status,
  };
  if (b.ownerResponseTime) out.ownerResponseTime = b.ownerResponseTime.toISOString();
  return out;
}

function wireVisit(v: {
  _id: Types.ObjectId;
  room: Types.ObjectId;
  customerName: string;
  customerPhone?: string;
  visitType: string;
  scheduledTime: Date;
  status: string;
  createdBy: Types.ObjectId;
}): Record<string, unknown> {
  const out: Record<string, unknown> = {
    _id: idStr(v._id),
    room: idStr(v.room),
    customerName: v.customerName,
    visitType: v.visitType,
    scheduledTime: v.scheduledTime.toISOString(),
    status: v.status,
    createdBy: idStr(v.createdBy),
  };
  if (v.customerPhone) out.customerPhone = v.customerPhone;
  return out;
}

function wireActionLog(a: {
  _id: Types.ObjectId;
  room: Types.ObjectId;
  actionType: string;
  salesUser: Types.ObjectId;
  timestamp: Date;
  notes?: string;
}): Record<string, unknown> {
  const out: Record<string, unknown> = {
    _id: idStr(a._id),
    room: idStr(a.room),
    actionType: a.actionType,
    salesUser: idStr(a.salesUser),
    timestamp: a.timestamp.toISOString(),
  };
  if (a.notes) out.notes = a.notes;
  return out;
}

export async function createBlockRequest(req: Request, res: Response): Promise<void> {
  try {
    const user = req.authUser!;
    const { roomId, expiryHours } = req.body as { roomId?: string; expiryHours?: number };
    if (!roomId) {
      res.status(400).json({ error: "roomId required" });
      return;
    }
    const hours = typeof expiryHours === "number" && expiryHours > 0 ? expiryHours : 6;
    const room = await Room.findById(roomId).exec();
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    if (room.status !== "vacant" && room.status !== "vacating") {
      res.status(400).json({ error: "Block requests only on vacant or vacating rooms" });
      return;
    }
    if (room.blockStatus === "pending" || room.blockStatus === "approved") {
      res.status(400).json({ error: "Room already has an active block (pending or approved)" });
      return;
    }
    const existing = await BlockRequest.findOne({ room: room._id, status: "pending" }).exec();
    if (existing) {
      res.status(400).json({ error: "A pending block request already exists for this room" });
      return;
    }
    const now = new Date();
    const expiry = new Date(now.getTime() + hours * 60 * 60 * 1000);
    const br = await BlockRequest.create({
      room: room._id,
      requestedBy: user._id,
      requestTime: now,
      expiryTime: expiry,
      status: "pending",
    });
    room.blockStatus = "pending";
    if (room.controlType !== "dedicated") {
      room.controlType = "requested";
    }
    await room.save();
    await ActionLog.create({
      room: room._id,
      actionType: "pitch",
      salesUser: user._id,
      timestamp: now,
      notes: `Block request created (expires ${expiry.toISOString()})`,
    });
    res.status(201).json(wireBlockRequest(br));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function createVisit(req: Request, res: Response): Promise<void> {
  try {
    const user = req.authUser!;
    const body = req.body as {
      roomId?: string;
      customerName?: string;
      customerPhone?: string;
      visitType?: string;
      scheduledTime?: string;
    };
    if (!body.roomId || !body.customerName || !body.visitType || !body.scheduledTime) {
      res.status(400).json({ error: "roomId, customerName, visitType, scheduledTime required" });
      return;
    }
    if (body.visitType !== "virtual" && body.visitType !== "physical") {
      res.status(400).json({ error: "visitType must be virtual or physical" });
      return;
    }
    const room = await Room.findById(body.roomId).exec();
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    const scheduledTime = new Date(body.scheduledTime);
    if (Number.isNaN(scheduledTime.getTime())) {
      res.status(400).json({ error: "Invalid scheduledTime" });
      return;
    }
    const visit = await Visit.create({
      room: room._id,
      customerName: body.customerName.trim(),
      customerPhone: body.customerPhone?.trim() || undefined,
      visitType: body.visitType,
      scheduledTime,
      status: "scheduled",
      createdBy: user._id,
    });
    const now = new Date();
    await ActionLog.create({
      room: room._id,
      actionType: "visit_scheduled",
      salesUser: user._id,
      timestamp: now,
      notes: `${body.visitType} visit for ${body.customerName}`,
    });
    res.status(201).json(wireVisit(visit));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

const ALLOWED_LOG_ACTIONS = new Set(["pitch", "virtual_tour", "visit_done", "booking"]);

export async function createActionLog(req: Request, res: Response): Promise<void> {
  try {
    const user = req.authUser!;
    const body = req.body as { roomId?: string; actionType?: string; notes?: string };
    if (!body.roomId || !body.actionType) {
      res.status(400).json({ error: "roomId and actionType required" });
      return;
    }
    if (!ALLOWED_LOG_ACTIONS.has(body.actionType)) {
      res.status(400).json({ error: "Invalid actionType for this endpoint" });
      return;
    }
    const room = await Room.findById(body.roomId).exec();
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    const now = new Date();
    if (body.actionType === "booking") {
      const okGate = room.controlType === "dedicated" || room.blockStatus === "approved";
      if (!okGate) {
        res
          .status(400)
          .json({ error: "Booking only allowed when controlType is dedicated or block is approved" });
        return;
      }
      room.status = "reserved";
      await room.save();
    }
    const log = await ActionLog.create({
      room: room._id,
      actionType: body.actionType as "pitch" | "virtual_tour" | "visit_done" | "booking",
      salesUser: user._id,
      timestamp: now,
      notes: body.notes?.trim() || undefined,
    });
    const logWire = wireActionLog(log);
    if (body.actionType === "booking") {
      const roomWire = await serializeRoomWithProperty(idStr(room._id));
      res.status(201).json({ actionLog: logWire, room: roomWire });
      return;
    }
    res.status(201).json({ actionLog: logWire });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
