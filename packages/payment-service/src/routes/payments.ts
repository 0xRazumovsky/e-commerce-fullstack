import { Router, Request, Response } from "express";
import Stripe from "stripe";
import {
  validate,
  createPaymentSchema,
  asyncHandler,
  AppError,
  logger,
} from "@e-commerce/shared";
import { PaymentService } from "../services/paymentService";

const paymentRoutes = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const paymentService = new PaymentService();

// Create payment
paymentRoutes.post(
  "/payments",
  asyncHandler(async (req: Request, res: Response) => {
    const data = validate(createPaymentSchema, req.body);
    const userId = req.user?.sub;

    if (!userId) {
      throw new AppError(401, "User not authenticated", "UNAUTHORIZED");
    }

    const { clientSecret, paymentIntentId } =
      await paymentService.createPayment(
        data.orderId,
        data.amount,
        "usd",
        userId,
      );

    res
      .status(201)
      .json({
        success: true,
        data: { clientSecret, paymentIntentId },
        timestamp: new Date().toISOString(),
      });
  }),
);

// Get payment
paymentRoutes.get(
  "/payments/:paymentId",
  asyncHandler(async (req: Request, res: Response) => {
    const { paymentId } = req.params;
    const userId = req.user?.sub;

    const payment = await paymentService.getPayment(paymentId);

    // Check authorization
    if (payment.user_id !== userId && req.user?.role !== "admin") {
      throw new AppError(403, "Access denied", "FORBIDDEN");
    }

    res.json({
      success: true,
      data: payment,
      timestamp: new Date().toISOString(),
    });
  }),
);

// Get payment by order
paymentRoutes.get(
  "/orders/:orderId/payment",
  asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const userId = req.user?.sub;

    const payment = await paymentService.getPaymentByOrder(orderId);

    // Check authorization
    if (payment.user_id !== userId && req.user?.role !== "admin") {
      throw new AppError(403, "Access denied", "FORBIDDEN");
    }

    res.json({
      success: true,
      data: payment,
      timestamp: new Date().toISOString(),
    });
  }),
);

// Create refund
paymentRoutes.post(
  "/payments/:paymentId/refund",
  asyncHandler(async (req: Request, res: Response) => {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;
    const userId = req.user?.sub;

    // Check authorization (admin only for refunds)
    if (req.user?.role !== "admin") {
      throw new AppError(403, "Only admins can create refunds", "FORBIDDEN");
    }

    const refund = await paymentService.createRefund(paymentId, amount, reason);

    res
      .status(201)
      .json({
        success: true,
        data: refund,
        timestamp: new Date().toISOString(),
      });
  }),
);

// Stripe webhook (public endpoint)
paymentRoutes.post(
  "/payments/webhook",
  asyncHandler(async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );

      // Handle the event using service
      await paymentService.handleWebhook(event);

      res.json({ received: true });
    } catch (error) {
      logger.error("Webhook signature verification failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      res.status(400).send("Webhook error");
    }
  }),
);

export default paymentRoutes;
