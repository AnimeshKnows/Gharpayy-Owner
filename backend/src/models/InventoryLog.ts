import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export type ConfirmationSource = "dashboard" | "whatsapp" | "bulk";

export interface IInventoryLog extends Document {
  room: Types.ObjectId;
  owner: Types.ObjectId;
  confirmedStatus: string; // vacant | vacating | occupied | no_change
  source: ConfirmationSource;
  confirmedAt: Date;
}

const inventoryLogSchema = new Schema<IInventoryLog>(
  {
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    confirmedStatus: {
      type: String,
      required: true,
      enum: ["vacant", "vacating", "occupied", "no_change"],
    },
    source: {
      type: String,
      required: true,
      enum: ["dashboard", "whatsapp", "bulk"],
      default: "dashboard",
    },
    confirmedAt: { type: Date, required: true, default: () => new Date(), index: true },
  },
  { timestamps: false },
);

export const InventoryLog: Model<IInventoryLog> =
  mongoose.models.InventoryLog ?? mongoose.model<IInventoryLog>("InventoryLog", inventoryLogSchema);
