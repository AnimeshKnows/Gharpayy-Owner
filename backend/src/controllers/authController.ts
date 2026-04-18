import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

export function login(jwtSecret: string) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const email = req.body?.email as string | undefined;
      const password = req.body?.password as string | undefined;
      if (!email || !password) {
        res.status(400).json({ error: "Email and password required" });
        return;
      }
      const user = await User.findOne({
        email: String(email).toLowerCase().trim(),
      }).exec();
      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      const token = jwt.sign(
        { sub: user._id.toString(), role: user.role },
        jwtSecret,
        { expiresIn: "7d" },
      );
      res.json({
        token,
        user: {
          _id: user._id.toString(),
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

export function me(req: Request, res: Response): void {
  const user = req.authUser;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(user);
}
