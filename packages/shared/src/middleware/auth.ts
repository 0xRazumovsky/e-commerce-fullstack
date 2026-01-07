import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError, JwtPayload } from "../types/types.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      correlationId?: string;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      throw new AppError(401, "Missing authorization token", "UNAUTHORIZED");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid token";
    throw new AppError(401, message, "TOKEN_INVALID");
  }
}

export function generateToken(
  userId: string,
  email: string,
  role: string,
): string {
  return jwt.sign({ sub: userId, email, role }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRATION || "24h",
  } as jwt.SignOptions);
}
