import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../types/auth";
import { User } from "../models/User";

function publicUser(u: {
  _id: { toString(): string };
  name: string;
  phone: string;
  email: string;
  role: string;
}): import("../types/auth").AuthUser {
  return {
    _id: u._id.toString(),
    name: u.name,
    phone: u.phone,
    email: u.email,
    role: u.role as import("../types/auth").AuthUser["role"],
  };
}

export function requireAuth(jwtSecret: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      const user = await User.findById(decoded.sub).exec();
      if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      req.authUser = publicUser(user);
      next();
    } catch {
      res.status(401).json({ error: "Unauthorized" });
    }
  };
}
