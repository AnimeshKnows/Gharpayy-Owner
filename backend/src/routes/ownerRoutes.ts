import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireOwnerParamMatchesJwt, requireRole } from "../middleware/role";
import {
  effortFeed,
  listBlockRequests,
  listProperties,
  listRooms,
} from "../controllers/ownerController";

export function buildOwnerRoutes(jwtSecret: string): Router {
  const router = Router({ mergeParams: true });
  router.use(requireAuth(jwtSecret));
  router.use(requireRole("owner"));
  router.use(requireOwnerParamMatchesJwt);
  router.get("/properties", listProperties);
  router.get("/rooms", listRooms);
  router.get("/block-requests", listBlockRequests);
  router.get("/effort-feed", effortFeed);
  return router;
}
