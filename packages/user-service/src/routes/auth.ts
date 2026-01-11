import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import {
  generateToken,
  validate,
  userRegistrationSchema,
  userLoginSchema,
  asyncHandler,
  AppError,
  logger,
} from "@e-commerce/shared/index.js";
import { pool } from "../config/database.js";

export const authRoutes = Router();

authRoutes.post(
  "/register",
  asyncHandler(async (req: Request, res: Response) => {
    const data = validate(userRegistrationSchema, req.body);

    const client = await pool.connect();
    try {
      const existingUser = await client.query(
        "SELECT id FROM users WHERE email = $1",
        [data.email],
      );
      if (existingUser.rows.length > 0) {
        throw new AppError(409, "User already exists", "ALREADY_EXISTS");
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const result = await client.query(
        "INSERT INTO users (email, password, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name",
        [data.email, hashedPassword, data.firstName, data.lastName, "user"],
      );

      const user = result.rows[0];
      const token = generateToken(user.id, user.email, "user");

      logger.info("User registered", { userId: user.id, email: user.email });

      res
        .status(201)
        .json({
          success: true,
          data: { user, token },
          timestamp: new Date().toISOString(),
        });
    } finally {
      client.release();
    }
  }),
);

authRoutes.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const data = validate(userLoginSchema, req.body);

    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT id, email, password, role FROM users WHERE email = $1",
        [data.email],
      );

      if (result.rows.length === 0) {
        throw new AppError(
          401,
          "Invalid. credentials or user doesn't exist",
          "INVALID_CREDENTIALS",
        );
      }

      const user = result.rows[0];
      const isPasswordValid = await bcrypt.compare(
        data.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
      }

      const token = generateToken(user.id, user.email, user.role);

      logger.info("User logged in", { userId: user.id, email: user.email });

      res.json({
        success: true,
        data: {
          user: { id: user.id, email: user.email, role: user.role },
          token,
        },
        timestamp: new Date().toISOString(),
      });
    } finally {
      client.release();
    }
  }),
);
