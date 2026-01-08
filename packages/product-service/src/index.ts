import express, { Request, Response } from "express";
import { MongoClient } from "mongodb";
import { errorHandler, logger } from "packages/shared/dist/index.js";
import { productRoutes } from "./routes/products.js";

const app = express();
const PORT = process.env.SERVICE_PORT || 3002;
let db: any;

app.use(express.json());

// MongoDB connection
async function initMongoDB() {
  try {
    const client = new MongoClient(
      process.env.MONGO_URL || "mongodb://localhost:27017/products",
    );
    await client.connect();
    db = client.db();

    // Create indexes
    const productsCollection = db.collection("products");
    await productsCollection.createIndex({ name: "text", description: "text" });
    await productsCollection.createIndex({ category: 1 });

    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.error("MongoDB connection error:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    setTimeout(initMongoDB, 5000);
  }
}

// Init
initMongoDB();

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "healthy", service: "product-service" });
});

app.use(
  "/",
  (req: Request, res: Response, next) => {
    (req as any).db = db;
    next();
  },
  productRoutes,
);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Product Service running on port ${PORT}`);
});
