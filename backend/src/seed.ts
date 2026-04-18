import "dotenv/config";
import mongoose, { type HydratedDocument } from "mongoose";
import bcrypt from "bcryptjs";
import { User, type IUser } from "./models/User";
import { Property } from "./models/Property";
import { Room, type IRoom } from "./models/Room";
import { BlockRequest } from "./models/BlockRequest";
import { ActionLog } from "./models/ActionLog";

const SALT_ROUNDS = 10;

async function ensureUser(
  data: {
    name: string;
    phone: string;
    email: string;
    password: string;
    role: "owner" | "sales";
  },
): Promise<IUser> {
  const existing = await User.findOne({ email: data.email }).exec();
  if (existing) return existing;
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  return User.create({
    name: data.name,
    phone: data.phone,
    email: data.email,
    passwordHash,
    role: data.role,
  });
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI in environment.");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const owner = await ensureUser({
    name: "Test Owner",
    phone: "9999999999",
    email: "owner@test.com",
    password: "owner123",
    role: "owner",
  });

  const sales = await ensureUser({
    name: "Test Sales",
    phone: "8888888888",
    email: "sales@test.com",
    password: "sales123",
    role: "sales",
  });

  let property = await Property.findOne({
    name: "Gharpayy Heights",
    owner: owner._id,
  }).exec();

  if (!property) {
    property = await Property.create({
      name: "Gharpayy Heights",
      location: "Prayagraj",
      owner: owner._id,
    });
  }

  const roomSpecs = [
    {
      roomNumber: "101",
      beds: 2,
      actualRent: 7500,
      expectedRent: 8000,
      status: "vacant" as const,
      controlType: "dedicated" as const,
      blockStatus: "none" as const,
    },
    {
      roomNumber: "102",
      beds: 3,
      actualRent: 7000,
      expectedRent: 7500,
      status: "vacating" as const,
      controlType: "open" as const,
      blockStatus: "none" as const,
    },
    {
      roomNumber: "103",
      beds: 2,
      actualRent: 8200,
      expectedRent: 8500,
      status: "vacant" as const,
      controlType: "requested" as const,
      blockStatus: "approved" as const,
    },
  ];

  const rooms: Record<string, HydratedDocument<IRoom>> = {};

  for (const spec of roomSpecs) {
    let room = await Room.findOne({
      property: property._id,
      roomNumber: spec.roomNumber,
    }).exec();

    if (!room) {
      room = await Room.create({
        property: property._id,
        roomNumber: spec.roomNumber,
        beds: spec.beds,
        actualRent: spec.actualRent,
        expectedRent: spec.expectedRent,
        status: spec.status,
        controlType: spec.controlType,
        blockStatus: spec.blockStatus,
      });
    }
    rooms[spec.roomNumber] = room;
  }

  const room103 = rooms["103"];
  const now = new Date();
  const expiry = new Date(now.getTime() + 6 * 60 * 60 * 1000);

  const existingBlock = await BlockRequest.findOne({
    room: room103._id,
    requestedBy: sales._id,
  }).exec();

  if (!existingBlock) {
    await BlockRequest.create({
      room: room103._id,
      requestedBy: sales._id,
      requestTime: now,
      expiryTime: expiry,
      status: "approved",
      ownerResponseTime: now,
    });
  }

  const logSpecs = [
    { roomKey: "101" as const, actionType: "pitch" as const },
    { roomKey: "103" as const, actionType: "visit_scheduled" as const },
  ];

  for (const { roomKey, actionType } of logSpecs) {
    const room = rooms[roomKey];
    const exists = await ActionLog.findOne({
      room: room._id,
      salesUser: sales._id,
      actionType,
    }).exec();

    if (!exists) {
      await ActionLog.create({
        room: room._id,
        salesUser: sales._id,
        actionType,
        timestamp: now,
      });
    }
  }

  await mongoose.disconnect();
  console.log("Seed finished: users, property, rooms, block request, and action logs are ready.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  void mongoose.disconnect().finally(() => process.exit(1));
});
