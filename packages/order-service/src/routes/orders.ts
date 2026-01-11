import { Router, Request, Response } from "express";
import {
  validate,
  createOrderSchema,
  asyncHandler,
  AppError,
  logger,
  publishEvent,
} from "@e-commerce/shared";
import pool from "../config/database";

const orderRoutes = Router();

orderRoutes.post(
  "/orders",
  asyncHandler(async (req: Request, res: Response) => {
    const data = validate(createOrderSchema, req.body);
    const userId = req.user?.sub;

    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO orders (user_id, items, total, status, shipping_address, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *`,
        [
          userId,
          JSON.stringify(data.items),
          data.items.reduce(
            (sum: number, item: any) => sum + item.price * item.quantity,
            0,
          ),
          "pending",
          JSON.stringify(data.shippingAddress),
        ],
      );

      const order = result.rows[0];

      // Publish order created event
      await publishEvent("ecommerce", "order.created", {
        orderId: order.id,
        userId,
        items: data.items,
        total: order.total,
        timestamp: new Date().toISOString(),
      });

      logger.info("Order created", { orderId: order.id, userId });

      res
        .status(201)
        .json({
          success: true,
          data: order,
          timestamp: new Date().toISOString(),
        });
    } finally {
      client.release();
    }
  }),
);

orderRoutes.get(
  "/orders/:userId",
  asyncHandler(async (req: Request, res: Response) => {
    if (req.user?.sub !== req.params.userId) {
      throw new AppError(403, "Forbidden", "FORBIDDEN");
    }

    const result = await pool.query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [req.params.userId],
    );

    res.json({
      success: true,
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  }),
);

export default orderRoutes;
