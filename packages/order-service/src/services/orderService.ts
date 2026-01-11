import { v4 as uuidv4 } from "uuid";
import pool from "../config/database";
import {
  AppError,
  Order,
  OrderItem,
  Address,
  logger,
  publishEvent,
  connectRabbitMQ,
} from "@e-commerce/shared";

export class OrderService {
  async createOrder(
    userId: string,
    items: OrderItem[],
    shippingAddress: Address,
    total: number,
  ): Promise<Order> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const orderId = uuidv4();
      const now = new Date();

      // Create order
      await client.query(
        `INSERT INTO orders (id, user_id, total, status, shipping_address, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          orderId,
          userId,
          total,
          "pending",
          JSON.stringify(shippingAddress),
          now,
          now,
        ],
      );

      // Insert order items
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
                VALUES ($1, $2, $3, $4)`,
          [orderId, item.productId, item.quantity, item.price],
        );
      }

      await client.query("COMMIT");

      // Publish event

      await publishEvent("orders", "order.created", {
        orderId,
        userId,
        items,
        total,
        timestamp: now.toISOString(),
      });

      logger.info("Order created", { orderId, userId });

      return {
        id: orderId,
        userId,
        items,
        total,
        status: "pending",
        shippingAddress,
        createdAt: now,
        updatedAt: now,
      } as Order;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error creating order", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new AppError(500, "Failed to create order");
    } finally {
      client.release();
    }
  }

  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const result = await pool.query(
        `SELECT o.*, array_agg(json_build_object("productId", oi.product_id, "quantity", oi.quantity, "price", oi.price))
            as items  FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = $1
            GROUP BY o.id`,
        [orderId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToOrder(result.rows);
    } catch (error) {
      logger.error("Error fetching order", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  async getUsersOrders(userId: string): Promise<Order[]> {
    try {
      const result = await pool.query(
        `SELECT o.*, array_agg(json_build_object("productId", oi.product_id, "quantity", oi.quantity, "price", oi.price))
            as items FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC`,
        [userId],
      );

      return result.rows.map((row) => this.mapRowToOrder(row));
    } catch (error) {
      logger.error("Error fetching user orders", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return [];
    }
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
  ): Promise<Order | null> {
    try {
      const now = new Date();
      await pool.query(
        `UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3`,
        [status, now, orderId],
      );

      const order = await this.getOrder(orderId);
      if (order) {
        logger.info("Order status updated", { orderId, status });
      }
      return order;
    } catch (error) {
      logger.error("Error updating order", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  private mapRowToOrder(row: any): Order {
    return {
      id: row.id,
      userId: row.userId,
      items: row.items || [],
      total: parseFloat(row.total),
      status: row.status,
      shippingAddress: JSON.parse(row.shipping_address),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    } as Order;
  }
}

export default new OrderService();
