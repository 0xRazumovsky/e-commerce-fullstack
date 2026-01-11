import { subscribeToQueue, AppError, logger } from "@e-commerce/shared";
import pool from "../config/database";

export async function setupPaymentEventHandlers() {
  try {
    // Listen for payment.completed
    await subscribeToQueue(
      "ecommerce",
      "order-payment-completed-queue",
      "payment.completed",
      handlePaymentCompleted,
    );

    // Listen for payment.failed
    await subscribeToQueue(
      "ecommerce",
      "order-payment-failed-queue",
      "payment.failed",
      handlePaymentFailed,
    );

    logger.info("Payment event handlers subscribed");
  } catch (error) {
    logger.error("Failed to setup payment event handlers", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function handlePaymentCompleted(msg: any) {
  const { paymentIntentId, orderId, amount } = msg;

  try {
    logger.info("Payment completed event received", { orderId, amount });

    const client = await pool.connect();
    try {
      // Update status to "processing"
      const result = await client.query(
        `UPDATE orders
                SET status = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *`,
        ["processing", orderId],
      );

      if (result.rows.length === 0) {
        throw new AppError(404, "Order not found", "NOT_FOUND");
      }

      const order = result.rows[0];

      // Update payment to "completed"

      await client.query(
        `UPDATE payments
                SET status = $1, updated_at = CURRENT_TIMESTAMP
                WHERE stripe_payment_intent_id = $2`,
        ["completed", paymentIntentId],
      );

      logger.info("Order status updated to processing", { orderId });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("Error handling payment completed event", {
      orderId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

async function handlePaymentFailed(msg: any) {
  const { paymentIntentId, orderId, reason } = msg;

  try {
    logger.info("Payment failed event received", { orderId, reason });

    const client = await pool.connect();
    try {
      // Update status to "payment_failed"
      const result = await client.query(
        `UPDATE orders
                SET status = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *`,
        ["payment_failed", orderId],
      );

      if (result.rows.length === 0) {
        throw new AppError(404, "Order not found", "NOT_FOUND");
      }

      // Update payment to "failed"
      await client.query(
        `UPDATE payments
                SET status = $1, updated_at = CURRENT_TIMESTAMP
                WHERE stripe_payment_intent_id = $2`,
        ["failed", paymentIntentId],
      );

      logger.info("Order status updated to payment_failed", {
        orderId,
        reason,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("Error handling payment failed event", {
      orderId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
