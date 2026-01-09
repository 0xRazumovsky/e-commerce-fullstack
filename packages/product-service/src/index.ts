import express, { Request, Response } from "express";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { MongoClient } from "mongodb";
import { errorHandler, logger } from "packages/shared/dist/index.js";
import { productRoutes } from "./routes/products.js";

const app = express();
const PORT = parseInt(process.env.SERVICE_PORT || "3002");

app.use(express.json());

connectDatabase().catch((err) => {
  logger.error("Failed to initialize database", { error: err.message });
  process.exit(1);
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "healthy", service: "product-service" });
});

app.use("/products", productRoutes);

app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`Product Service running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down");
  disconnectDatabase().finally(() => server.close());
});

export default app;
