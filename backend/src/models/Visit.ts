import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export type VisitType = "virtual" | "physical";
export type VisitStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export interface IVisit extends Document {
  room: Types.ObjectId;
  customerName: string;
  customerPhone?: string;
  visitType: VisitType;
  scheduledTime: Date;
  status: VisitStatus;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const visitSchema = new Schema<IVisit>(
  {
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true },
    visitType: { type: String, required: true, enum: ["virtual", "physical"] },
    scheduledTime: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ["scheduled", "completed", "cancelled", "no_show"],
      default: "scheduled",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const Visit: Model<IVisit> =
  mongoose.models.Visit ?? mongoose.model<IVisit>("Visit", visitSchema);
