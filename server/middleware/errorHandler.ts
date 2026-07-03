import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error("Global Error Caught:", err);
  
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";
  
  res.status(status).json({
    success: false,
    error: message,
    code: err.code || "INTERNAL_ERROR",
    details: err.details || null
  });
}
