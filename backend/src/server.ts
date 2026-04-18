import "dotenv/config";
import "./types/auth";
import { createApp } from "./app";
import { connectDb } from "./config/db";

const PORT = process.env.PORT ?? "3000";
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:8080";

async function main(): Promise<void> {
  if (!MONGODB_URI || !JWT_SECRET) {
    console.error("Missing required env: MONGODB_URI and/or JWT_SECRET");
    process.exit(1);
  }

  await connectDb(MONGODB_URI);

  const app = createApp({
    jwtSecret: JWT_SECRET,
    frontendUrl: FRONTEND_URL,
  });

  app.listen(Number(PORT), () => {
    console.log(`API listening on port ${PORT}`);
    console.log(`CORS origin: ${FRONTEND_URL}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
