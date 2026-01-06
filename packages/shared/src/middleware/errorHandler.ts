import { Request, Response, NextFunction } from "express";
import { AppError, ApiResponse } from "../types/types";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    const response: ApiResponse<null> = {
      success: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
    return res.status(err.statusCode).json(response);
  }

  const response: ApiResponse<null> = {
    success: false,
    error: "500: Internal server error",
    timestamp: new Date().toISOString(),
  };
  res.status(500).json(response);
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
