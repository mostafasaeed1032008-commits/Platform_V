import { Request, Response, NextFunction } from "express";

const rateLimits: Record<string, { count: number; resetAt: number }> = {};

export function rateLimiter(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    if (!rateLimits[ip] || now > rateLimits[ip].resetAt) {
      rateLimits[ip] = { count: 1, resetAt: now + windowMs };
      return next();
    }

    rateLimits[ip].count++;
    if (rateLimits[ip].count > limit) {
      res.status(429).json({ error: "Too many login/registration attempts. Please try again later." });
      return;
    }
    next();
  };
}
