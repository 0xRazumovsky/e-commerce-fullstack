import express, { Request, Response } from "express";
import { initDatabase } from "./config/database";
import {
  connectRabbitMQ,
  logger,
  errorHandler,
  authMiddleware,
} from "@e-commerce/shared";
import { PaymentService } from "./services/paymentService";
import paymentRoutes from "./routes/payments";

const app = express();
const PORT = process.env.SERVICE_PORT || 3005;
const paymentService = new PaymentService();

// Important: Raw body for Stripe webhook signature verification
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// Initialize all services
async function initServices() {
  try {
    // 1. Initialize database
    await initDatabase();
    logger.info("Database initialized");

    // 2. Connect to RabbitMQ
    await connectRabbitMQ();
    logger.info("RabbitMQ connected");

    logger.info("Payment Service initialized successfully");
  } catch (error) {
    logger.error("Service initialization error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    setTimeout(initServices, 5000);
  }
}

initServices();

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "healthy", service: "payment-service" });
});

// Routes
app.post("/payments/webhook", paymentRoutes); // Public webhook route (before auth)
app.use("/", authMiddleware, paymentRoutes); // Protected routes

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Payment Service running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});
