import { Router } from "express";
import { login, me } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

export function buildAuthRoutes(jwtSecret: string): Router {
  const router = Router();
  router.post("/login", login(jwtSecret));
  router.get("/me", requireAuth(jwtSecret), me);
  return router;
}
