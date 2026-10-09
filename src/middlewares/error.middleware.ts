import type { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export interface CustomError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Ocorreu um erro interno no servidor";

  if (statusCode >= 500) {
    console.error(`[Error] ${req.method} ${req.path} -> ${statusCode}:`, err);
  }

  res.status(statusCode).json({
    status_code: statusCode,
    message,
    error: statusCode >= 500 ? "Internal Server Error" : "Bad Request",
  });
}
