import type { NextFunction, Request, Response } from "express";

// Wrap async express handlers so thrown/rejected errors flow into our
// centralized `errorHandler`.
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// Convert any thrown value into a consistent JSON error response.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const status = typeof err === "object" && err && "status" in err ? Number((err as any).status) : 500;
  const message = typeof err === "object" && err && "message" in err ? String((err as any).message) : "Server error";
  res.status(Number.isFinite(status) ? status : 500).json({ error: message });
}

