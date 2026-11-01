import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(404, code, message);
  }
}

// Express recognises an error handler by its four arguments.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  req.log.error({ err }, "Unhandled error");
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
}
