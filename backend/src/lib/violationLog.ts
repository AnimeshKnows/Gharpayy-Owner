import type { Types } from "mongoose";
import { Violation } from "../models/Violation";

export async function logViolation(
  roomId: Types.ObjectId | string,
  ownerId: Types.ObjectId | string,
  type: string,
  description: string,
): Promise<void> {
  await Violation.create({
    room: roomId,
    owner: ownerId,
    type,
    description,
    timestamp: new Date(),
  });
}

/** Owner status change that conflicts with dedicated commitment. */
export async function maybeViolationStatusChange(params: {
  beforeDedicated: boolean;
  beforeBlockApproved: boolean;
  newStatus: string;
  roomId: Types.ObjectId | string;
  ownerId: Types.ObjectId | string;
}): Promise<void> {
  const { beforeDedicated, beforeBlockApproved, newStatus, roomId, ownerId } = params;
  if (beforeDedicated && newStatus === "occupied") {
    await logViolation(
      roomId,
      ownerId,
      "dedicated_status_override",
      "Owner marked room occupied while it was under dedicated control.",
    );
  }
  if (beforeBlockApproved && (newStatus === "occupied" || newStatus === "vacant")) {
    await logViolation(
      roomId,
      ownerId,
      "approved_block_availability_override",
      `Owner set status to ${newStatus} while an approved sales block was active.`,
    );
  }
}

/** Owner removed dedicated while an approved block was in effect. */
export async function maybeViolationDedicatedOff(params: {
  beforeDedicated: boolean;
  beforeBlockApproved: boolean;
  newDedicated: boolean;
  roomId: Types.ObjectId | string;
  ownerId: Types.ObjectId | string;
}): Promise<void> {
  if (params.beforeDedicated && !params.newDedicated && params.beforeBlockApproved) {
    await logViolation(
      params.roomId,
      params.ownerId,
      "dedicated_removed_under_block",
      "Owner removed dedicated control while blockStatus was approved.",
    );
  }
}
