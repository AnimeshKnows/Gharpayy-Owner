import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export type ActionType =
  | "pitch"
  | "virtual_tour"
  | "visit_scheduled"
  | "visit_done"
  | "booking";

export interface IActionLog extends Document {
  room: Types.ObjectId;
  actionType: ActionType;
  salesUser: Types.ObjectId;
  timestamp: Date;
  notes?: string;
}

const actionLogSchema = new Schema<IActionLog>(
  {
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    actionType: {
      type: String,
      required: true,
      enum: ["pitch", "virtual_tour", "visit_scheduled", "visit_done", "booking"],
    },
    salesUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
    timestamp: { type: Date, required: true, index: true },
    notes: { type: String },
  },
  { timestamps: false },
);

export const ActionLog: Model<IActionLog> =
  mongoose.models.ActionLog ?? mongoose.model<IActionLog>("ActionLog", actionLogSchema);
