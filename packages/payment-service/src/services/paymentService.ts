import Stripe from "stripe";
import pool from "../config/database";
import { publishEvent, AppError, Payment, logger } from "@e-commerce/shared";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export class PaymentService {
  static getPayment(paymentId: string) {
    throw new Error("Method not implemented.");
  }
  static createPayment: any;
  async createPayment(
    orderId: string,
    amount: number,
    currency: string = "usd",
    userId: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency.toLowerCase(),
          metadata: { orderId, userId },
        },
        { idempotencyKey: `${orderId}-${userId}` },
      );

      // Store payment in database
      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO payments (order_id, amount, currency, status, stripe_payment_intent_id, user_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [orderId, amount, currency, "pending", paymentIntent.id, userId],
        );
      } finally {
        client.release();
      }

      logger.info("Payment created", {
        paymentIntentId: paymentIntent.id,
        orderId,
        amount,
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      logger.error("Payment creation error", {
        orderId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new AppError(400, "Payment creation failed", "PAYMENT_FAILED");
    }
  }

  async getPayment(paymentId: string): Promise<any> {
    try {
      const result = await pool.query("SELECT * FROM payments WHERE id = $1", [
        paymentId,
      ]);

      if (result.rows.length === 0) {
        throw new AppError(404, "Payment not found", "NOT_FOUND");
      }

      return result.rows;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error fetching payment", {
        paymentId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getPaymentByOrder(orderId: string): Promise<any> {
    try {
      const result = await pool.query(
        "SELECT * FROM payments WHERE order_id = $1",
        [orderId],
      );

      if (result.rows.length === 0) {
        throw new AppError(404, "Payment not found for order", "NOT_FOUND");
      }

      return result.rows;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error fetching payment by order", {
        orderId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async createRefund(
    paymentId: string,
    amount: number,
    reason: string,
  ): Promise<any> {
    try {
      const client = await pool.connect();
      let payment: any;

      try {
        const result = await client.query(
          "SELECT * FROM payments WHERE id = $1",
          [paymentId],
        );

        if (result.rows.length === 0) {
          throw new AppError(404, "Payment not found", "NOT_FOUND");
        }

        payment = result.rows;

        if (payment.status !== "completed") {
          throw new AppError(
            400,
            "Can only refund completed payments",
            "INVALID_REQUEST",
          );
        }

        // Create Stripe refund
        const refund = await stripe.refunds.create({
          payment_intent: payment.stripe_payment_intent_id,
          amount: Math.round(amount * 100),
          reason: reason as any,
        });

        // Store refund in database
        await client.query(
          `INSERT INTO refunds (payment_id, amount, reason, status, stripe_refund_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [paymentId, amount, reason, refund.status, refund.id],
        );

        logger.info("Refund created", {
          paymentId,
          refundId: refund.id,
          amount,
        });

        return refund;
      } finally {
        client.release();
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error creating refund", {
        paymentId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new AppError(500, "Refund creation failed", "PAYMENT_FAILED");
    }
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case "payment_intent.succeeded":
          await this.handlePaymentSuccess(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        case "payment_intent.payment_failed":
          await this.handlePaymentFailure(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        default:
          logger.debug("Unhandled webhook event", { type: event.type });
      }
    } catch (error) {
      logger.error("Error handling webhook", {
        eventType: event.type,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  private async handlePaymentSuccess(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    try {
      const orderId = paymentIntent.metadata?.orderId;

      if (!orderId) {
        logger.warn("Payment succeeded without orderId in metadata", {
          paymentIntentId: paymentIntent.id,
        });
        return;
      }

      const client = await pool.connect();
      try {
        // Update payment status
        await client.query(
          "UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE stripe_payment_intent_id = $2",
          ["completed", paymentIntent.id],
        );
      } finally {
        client.release();
      }

      // Publish payment.completed event
      await publishEvent("ecommerce", "payment.completed", {
        paymentIntentId: paymentIntent.id,
        orderId,
        amount: paymentIntent.amount / 100,
        timestamp: new Date().toISOString(),
      });

      logger.info("Payment succeeded event published", {
        paymentIntentId: paymentIntent.id,
        orderId,
      });
    } catch (error) {
      logger.error("Error handling payment success", {
        paymentIntentId: paymentIntent.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  private async handlePaymentFailure(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    try {
      const orderId = paymentIntent.metadata?.orderId;

      if (!orderId) {
        logger.warn("Payment failed without orderId in metadata", {
          paymentIntentId: paymentIntent.id,
        });
        return;
      }

      const client = await pool.connect();
      try {
        // Update payment status
        await client.query(
          "UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE stripe_payment_intent_id = $2",
          ["failed", paymentIntent.id],
        );
      } finally {
        client.release();
      }

      // Publish payment.failed event
      await publishEvent("ecommerce", "payment.failed", {
        paymentIntentId: paymentIntent.id,
        orderId,
        reason: paymentIntent.last_payment_error?.message || "Unknown error",
        timestamp: new Date().toISOString(),
      });

      logger.info("Payment failed event published", {
        paymentIntentId: paymentIntent.id,
        orderId,
      });
    } catch (error) {
      logger.error("Error handling payment failure", {
        paymentIntentId: paymentIntent.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
}

export default new PaymentService();
