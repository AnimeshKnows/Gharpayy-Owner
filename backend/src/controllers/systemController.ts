import type { Request, Response } from "express";
import { Room } from "../models/Room";

export async function sweepLocks(_req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const candidates = await Room.find({
      blockStatus: "approved",
      lockedUntil: { $lt: now },
    }).exec();

    let updated = 0;
    for (const room of candidates) {
      room.blockStatus = "none";
      room.lockedUntil = undefined;
      if (room.controlType !== "dedicated") {
        room.controlType = "open";
      }
      await room.save();
      updated += 1;
    }
    res.json({ updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
