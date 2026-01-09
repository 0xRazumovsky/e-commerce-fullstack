import express, { Request, Response } from "express";
import { connectRedis, disconnectRedis } from "./config/redis";
import {
  authMiddleware,
  logger,
  errorHandler,
  asyncHandler,
} from "packages/shared";
import { cartRoutes } from "./routes/cart";

const app = express();
const PORT = parseInt(process.env.SERVICE_PORT || "3003");

app.use(express.json());

connectRedis().catch((err) => {
  logger.error("Failed to initialize Redis", { error: err.message });
  process.exit(1);
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "healthy", service: "cart-service" });
});

app.use("/cart", authMiddleware, cartRoutes);

const server = app.listen(PORT, () => {
  logger.info(`Cart service running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down");
  disconnectRedis().finally(() => server.close());
});

export default app;
