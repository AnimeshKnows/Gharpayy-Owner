import express from "express";
import cors from "cors";
import { buildAuthRoutes } from "./routes/authRoutes";
import { buildOwnerRoutes } from "./routes/ownerRoutes";
import { buildSalesRoutes } from "./routes/salesRoutes";

export interface AppConfig {
  jwtSecret: string;
  frontendUrl: string;
}

export function createApp(config: AppConfig): express.Application {
  const app = express();

  app.use(
    cors({
      origin: config.frontendUrl,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", buildAuthRoutes(config.jwtSecret));
  app.use("/api/owner/:ownerId", buildOwnerRoutes(config.jwtSecret));
  app.use("/api/sales", buildSalesRoutes(config.jwtSecret));

  return app;
}
