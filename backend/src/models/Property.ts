import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IProperty extends Document {
  name: string;
  location: string;
  owner: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const propertySchema = new Schema<IProperty>(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true },
);

export const Property: Model<IProperty> =
  mongoose.models.Property ?? mongoose.model<IProperty>("Property", propertySchema);
