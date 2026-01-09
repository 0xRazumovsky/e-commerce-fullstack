import { createClient, RedisClientType } from "redis";
import { logger } from "packages/shared/dist";

let redisClient: RedisClientType;

export async function connectRedis(): Promise<void> {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    redisClient.on("error", (err) => {
      logger.error("Redis client error", { error: err.message });
    });

    await redisClient.connect();
    logger.info("Redis connected successfully");
  } catch (error) {
    logger.error("Redis connection error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error("Redis not initialized. Call connectRedis() first");
  }
  return redisClient;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info("Redis disconnected");
  }
}
