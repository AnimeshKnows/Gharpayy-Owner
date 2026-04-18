import { Router } from "express";
import { requireInternalSweepKey } from "../middleware/internalSweep";
import { sweepLocks } from "../controllers/systemController";

export function buildSystemRoutes(): Router {
  const router = Router();
  router.post("/sweep-locks", requireInternalSweepKey, sweepLocks);
  return router;
}
