import type { NextFunction, Request, Response } from "express";

/** POST /api/system/sweep-locks — requires `x-internal-key` matching INTERNAL_SWEEP_KEY. */
export function requireInternalSweepKey(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.INTERNAL_SWEEP_KEY;
  if (!expected || expected.length < 8) {
    res.status(503).json({
      error: "Service unavailable",
      message: "Set INTERNAL_SWEEP_KEY (min 8 chars) in the backend environment.",
    });
    return;
  }
  const got = req.headers["x-internal-key"];
  if (typeof got !== "string" || got !== expected) {
    res.status(403).json({
      error: "Forbidden",
      message: "Valid x-internal-key header required for sweep-locks.",
    });
    return;
  }
  next();
}
