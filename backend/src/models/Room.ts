import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export type RoomStatus =
  | "occupied"
  | "vacating"
  | "vacant"
  | "blocked"
  | "reserved";

export type ControlType = "open" | "requested" | "dedicated";
export type BlockStatus = "none" | "pending" | "approved" | "rejected";

export interface IRoom extends Document {
  property: Types.ObjectId;
  roomNumber: string;
  beds: number;
  actualRent: number;
  expectedRent: number;
  floorPrice?: number;
  status: RoomStatus;
  controlType: ControlType;
  blockStatus: BlockStatus;
  lockedUntil?: Date;
  vacatingDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    property: { type: Schema.Types.ObjectId, ref: "Property", required: true, index: true },
    roomNumber: { type: String, required: true, trim: true },
    beds: { type: Number, required: true, min: 0 },
    actualRent: { type: Number, required: true, min: 0 },
    expectedRent: { type: Number, required: true, min: 0 },
    floorPrice: { type: Number, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ["occupied", "vacating", "vacant", "blocked", "reserved"],
      index: true,
    },
    controlType: {
      type: String,
      required: true,
      enum: ["open", "requested", "dedicated"],
    },
    blockStatus: {
      type: String,
      required: true,
      enum: ["none", "pending", "approved", "rejected"],
    },
    lockedUntil: { type: Date },
    vacatingDate: { type: Date },
  },
  { timestamps: true },
);

export const Room: Model<IRoom> =
  mongoose.models.Room ?? mongoose.model<IRoom>("Room", roomSchema);
