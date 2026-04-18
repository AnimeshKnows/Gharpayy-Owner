import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IAllocation extends Document {
  property: Types.ObjectId;
  owner: Types.ObjectId;
  allocatedRoomsCount: number;
  allocatedBedsCount: number;
  minCommitment: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const allocationSchema = new Schema<IAllocation>(
  {
    property: { type: Schema.Types.ObjectId, ref: "Property", required: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    allocatedRoomsCount: { type: Number, required: true, default: 0, min: 0 },
    allocatedBedsCount: { type: Number, required: true, default: 0, min: 0 },
    minCommitment: { type: Number, required: true, default: 0, min: 0 },
    active: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

allocationSchema.index({ property: 1, owner: 1 }, { unique: true });

export const Allocation: Model<IAllocation> =
  mongoose.models.Allocation ?? mongoose.model<IAllocation>("Allocation", allocationSchema);
