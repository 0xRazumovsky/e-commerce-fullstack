import express, { Request, Response } from "express";
import { initDatabase } from "./config/database";
import {
  connectRabbitMQ,
  subscribeToQueue,
  logger,
  authMiddleware,
  errorHandler,
  asyncHandler,
} from "@e-commerce/shared";
import orderRoutes from "./routes/orders";
import { handlePaymentCompleted } from "./events/payment";

const app = express();
const PORT = process.env.SERVICE_PORT || 3004;

app.use(express.json());
app.use(authMiddleware);

// Init services
async function initServices() {
  try {
    await initDatabase();
    await connectRabbitMQ();

    // Subscribe to payment events
    await subscribeToQueue(
      "ecommerce",
      "order-payment-queue",
      "payment.completed",
      handlePaymentCompleted,
    );

    logger.info("Order service initialized");
  } catch (error) {
    logger.error("Service initialization error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    setTimeout(initServices, 5000);
  }
}

initServices();

app.get(
  "/health",
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ status: "healthy", service: "order-service" });
  }),
);

app.use("/", orderRoutes);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Order service running on port ${PORT}`);
});
