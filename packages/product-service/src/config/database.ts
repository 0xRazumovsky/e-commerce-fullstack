import { MongoClient, Db, Collection, ObjectId } from "mongodb";
import { logger } from "packages/shared/dist/index.js";

let client: MongoClient;
let db: Db;

export interface ProductDb {
  _id: ObjectId;
  name: string;
  description: string;
  price: number;
  inventory: number;
  category: string;
  images: string[];
  rating: number;
  reviews: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  inventory: number;
  category: string;
  images: string[];
  rating: number;
  reviews: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function connectDatabase(): Promise<void> {
  try {
    client = new MongoClient(
      process.env.MONGO_URL || "mongodb://localhost:27017",
    );
    await client.connect();
    db = client.db("products");

    // Create collections if they don't exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    if (!collectionNames.includes("products")) {
      await db.createCollection("products");
    }

    if (!collectionNames.includes("categories")) {
      await db.createCollection("categories");
    }

    // Create indexes
    const productsCollection = db.collection<ProductDb>("products");
    await productsCollection.createIndex({ name: "text", description: "text" });
    await productsCollection.createIndex({ category: 1 });
    await productsCollection.createIndex({ price: 1 });
    await productsCollection.createIndex({ createdAt: -1 });

    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.error("MongoDB connection error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export function getDB(): Db {
  if (!db) {
    throw new Error("Database not initialized. Call connectDatabase() first");
  }
  return db;
}

// Returns ProductDb (with ObjectId)
export function getProductsCollection(): Collection<ProductDb> {
  return getDB().collection<ProductDb>("products");
}

export function getCategoriesCollection(): Collection<any> {
  return getDB().collection("categories");
}

// Helper to convert ProductDb to Product (ObjectId -> string)
export function convertDbToApi(dbProduct: ProductDb): Product {
  return { ...dbProduct, _id: dbProduct._id.toString() };
}

export async function disconnectDatabase(): Promise<void> {
  if (client) {
    await client.close();
    logger.info("MongoDB disconnected");
  }
}
