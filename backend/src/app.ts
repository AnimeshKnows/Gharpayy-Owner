import express from "express";
import cors from "cors";
import { buildAuthRoutes } from "./routes/authRoutes";
import { buildOwnerRoutes } from "./routes/ownerRoutes";
import { buildSalesRoutes } from "./routes/salesRoutes";
import { buildSystemRoutes } from "./routes/systemRoutes";

export interface AppConfig {
  jwtSecret: string;
  frontendUrl: string;
}

export function createApp(config: AppConfig): express.Application {
  const app = express();

  const isDev = process.env.NODE_ENV !== "production";

  app.use(
    cors({
      origin: isDev
        ? (origin, cb) => {
            // In dev, allow any localhost origin (any port) + no-origin requests
            if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
              cb(null, true);
            } else {
              cb(null, config.frontendUrl);
            }
          }
        : config.frontendUrl,
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
  app.use("/api/system", buildSystemRoutes());

  return app;
}
