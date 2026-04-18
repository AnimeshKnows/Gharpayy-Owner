import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { inventory } from "../controllers/salesController";

export function buildSalesRoutes(jwtSecret: string): Router {
  const router = Router();
  router.get("/inventory", requireAuth(jwtSecret), requireRole("sales"), inventory);
  return router;
}
