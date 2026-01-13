import {
  connectRabbitMQ,
  subscribeToQueue,
  logger,
  disconnectRabbitMQ,
} from "@e-commerce/shared";
import emailService from "./services/emailService";
import smsService from "./services/smsService";

async function startConsumer() {
  try {
    await connectRabbitMQ();

    // Subscribe to order events
    await subscribeToQueue(
      "orders",
      "notification.orders",
      "order.*",
      async (message) => {
        logger.info("Order event received", { message });

        if (message.event === "order.created") {
          await emailService.sendOrderConfirmation(
            message.email,
            message.orderId,
            message.items,
          );
          if (message.phoneNumber) {
            await smsService.sendOrderNotification(
              message.phoneNumber,
              message.orderId,
            );
          }
        }
      },
    );

    // Subscribe to payment events
    await subscribeToQueue(
      "payments",
      "notification.payments",
      "payment.*",
      async (message) => {
        logger.info("Payment event received", { message });

        if (message.event === "payment.completed") {
          await emailService.sendPaymentConfirmation(
            message.email,
            message.orderId,
            message.amount,
          );
          if (message.phoneNumber) {
            await smsService.sendPaymentNotification(
              message.phoneNumber,
              message.orderId,
              message.amount,
            );
          }
        }
      },
    );

    logger.info("Notification Service started and listening to events");
  } catch (error) {
    logger.error("Failed to start notification service", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down");
  await disconnectRabbitMQ();
});

startConsumer();
