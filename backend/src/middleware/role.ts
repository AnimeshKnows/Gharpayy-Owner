import type { NextFunction, Request, Response } from "express";
import type { Role } from "../types/auth";

export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.authUser;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!allowed.includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export function requireOwnerParamMatchesJwt(req: Request, res: Response, next: NextFunction): void {
  const { ownerId } = req.params;
  const user = req.authUser;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (ownerId !== user._id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
