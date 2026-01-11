import amqp, { Message } from "amqplib";
import { logger } from "../utils/logger.js";

let connection: any;
let channel: any;

export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://localhost",
    );
    channel = await connection.createChannel();

    connection.on("error", (err: Error) => {
      logger.error("RabbitMQ connection error", { error: err.message });
      setTimeout(connectRabbitMQ, 5000);
    });

    connection.on("close", () => {
      logger.warn("RabbitMQ connection closed");
      setTimeout(connectRabbitMQ, 5000);
    });

    logger.info("RabbitMQ connected successfully");
  } catch (error) {
    logger.error("Failed to connect to RabbitMQ", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    setTimeout(connectRabbitMQ, 5000);
  }
}

export async function publishEvent(
  exchange: string,
  routingKey: string,
  data: any,
): Promise<void> {
  try {
    await channel.assertExchange(exchange, "topic", { durable: true });
    channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    });

    logger.debug("Event published", { exchange, routingKey, data });
  } catch (error) {
    logger.error("Failed to publish event", {
      exchange,
      routingKey,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function subscribeToQueue(
  exchange: string,
  queue: string,
  routingKey: string,
  handler: (msg: any) => Promise<void>,
): Promise<void> {
  try {
    await channel.assertExchange(exchange, "topic", { durable: true });
    const q = await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(q.queue, exchange, routingKey);

    await channel.consume(q.queue, async (msg: Message) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content);
          channel.ack(msg);

          logger.debug("Message processed", { queue: content });
        } catch (error) {
          logger.error("Error processing message", {
            queue,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          channel.nack(msg, false, true); // Requeue message
        }
      }
    });

    logger.info("Subscribed to queue", { exchange, queue, routingKey });
  } catch (error) {
    logger.error("Failed to subscribe to queue", {
      exchange,
      queue,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function disconnectRabbitMQ(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    logger.info("RabbitMQ disconnected");
  } catch (error) {
    logger.error("Error disconnecting RabbitMQ", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
