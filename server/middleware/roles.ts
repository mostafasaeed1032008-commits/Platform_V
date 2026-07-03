import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";

export function requireRole(role: "teacher" | "student") {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      res.status(403).json({ error: "Access denied. Forbidden for this user role." });
      return;
    }
    next();
  };
}
