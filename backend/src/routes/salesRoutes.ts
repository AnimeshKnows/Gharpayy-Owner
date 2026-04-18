import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { inventory } from "../controllers/salesController";
import {
  createActionLog,
  createBlockRequest,
  createVisit,
} from "../controllers/salesMutationsController";

export function buildSalesRoutes(jwtSecret: string): Router {
  const router = Router();
  router.get("/inventory", requireAuth(jwtSecret), requireRole("sales"), inventory);
  router.post("/block-requests", requireAuth(jwtSecret), requireRole("sales"), createBlockRequest);
  router.post("/visits", requireAuth(jwtSecret), requireRole("sales"), createVisit);
  router.post("/action-logs", requireAuth(jwtSecret), requireRole("sales"), createActionLog);
  return router;
}
