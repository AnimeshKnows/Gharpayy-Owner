import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export type BlockRequestStatus = "pending" | "approved" | "rejected";

export interface IBlockRequest extends Document {
  room: Types.ObjectId;
  requestedBy: Types.ObjectId;
  requestTime: Date;
  expiryTime: Date;
  status: BlockRequestStatus;
  ownerResponseTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const blockRequestSchema = new Schema<IBlockRequest>(
  {
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestTime: { type: Date, required: true },
    expiryTime: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "approved", "rejected"],
      index: true,
    },
    ownerResponseTime: { type: Date },
  },
  { timestamps: true },
);

export const BlockRequest: Model<IBlockRequest> =
  mongoose.models.BlockRequest ??
  mongoose.model<IBlockRequest>("BlockRequest", blockRequestSchema);
