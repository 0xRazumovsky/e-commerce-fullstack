import {Router, Request, Response} from "express";
import { authMiddleware, asyncHandler, AppError, logger } from "@e-commerce/shared/index.js";
import { pool } from "../config/database.js";

export const router = Router();

router.get("/:id", authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.id;

    const result = await pool.query(
        'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1',
        [userId]
    );

    if (result.rows.length === 0) {
        throw new AppError(404, "User not found", "NOT_FOUND");
    }

    res.json({
        success: true,
        data: result.rows[0],
        timestamp: new Date().toISOString(),
    });
}));

router.put("/:id", authMiddleware, asyncHandler(async (req: Request, res: Response) => {
    if (req.user?.sub !== req.params.id && req.user?.role !== "admin") {
        throw new AppError(403, "Forbidden", "FORBIDDEN");
    }

    const {firstName, lastName} = req.body;
    const userId = req.params.id;

    const result = await pool.query(
        "UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *",
        [firstName, lastName, userId]
    );

    if (result.rows.length === 0) {
        throw new AppError(404, "User not found", "NOT_FOUND");
    }

    logger.info("User updated", {userId});

    res.json({
        success: true,
        data: result.rows[0],
        timestamp: new Date().toISOString(),
    });
}));