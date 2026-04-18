import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IViolation extends Document {
  room: Types.ObjectId;
  owner: Types.ObjectId;
  type: string;
  description: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const violationSchema = new Schema<IViolation>(
  {
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true },
    description: { type: String, required: true },
    timestamp: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true },
);

export const Violation: Model<IViolation> =
  mongoose.models.Violation ?? mongoose.model<IViolation>("Violation", violationSchema);
