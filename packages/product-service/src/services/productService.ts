import { ObjectId } from "mongodb";
import {
  getCategoriesCollection,
  getProductsCollection,
  Product,
  ProductDb,
  convertDbToApi,
} from "../config/database.js";
import { AppError, logger } from "packages/shared/dist/index.js";

export class ProductService {
  async createProduct(
    data: Omit<Product, "_id" | "createdAt" | "updatedAt">,
  ): Promise<Product> {
    try {
      const productsCollection = getProductsCollection();
      const productDb: Omit<ProductDb, "_id"> = {
        ...data,
        rating: 0,
        reviews: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await productsCollection.insertOne(productDb as any);

      logger.info("Product created", {
        productId: result.insertedId.toString(),
      });

      // Return with string ID
      return { ...productDb, _id: result.insertedId.toString() } as Product;
    } catch (error) {
      logger.error("Error creating product", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new AppError(500, "Failed to create product");
    }
  }

  async getProduct(id: string): Promise<Product | null> {
    try {
      const productsCollection = getProductsCollection();

      // Query with ObjectId
      const product = await productsCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!product) {
        return null;
      }

      // Convert to API format
      return convertDbToApi(product);
    } catch (error) {
      logger.error("Error fetching product", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    }
  }

  async getAllProducts(
    page: number = 1,
    limit: number = 20,
    category?: string,
    search?: string,
  ): Promise<{ products: Product[]; total: number }> {
    try {
      const productsCollection = getProductsCollection();
      const skip = (page - 1) * limit;
      const query: any = {};

      if (category) {
        query.category = category;
      }

      if (search) {
        query.$text = { $search: search };
      }

      const [productsDb, total] = await Promise.all([
        productsCollection
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        productsCollection.countDocuments(query),
      ]);

      // Convert all products to API format
      const products = productsDb.map(convertDbToApi);

      return { products, total };
    } catch (error) {
      logger.error("Error fetching products", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new AppError(500, "Failed to fetch products");
    }
  }

  async updateProduct(
    id: string,
    data: Partial<Product>,
  ): Promise<Product | null> {
    try {
      const productsCollection = getProductsCollection();

      const { _id, ...updateData } = data;

      const result = await productsCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { ...updateData, updatedAt: new Date() } },
        { returnDocument: "after" },
      );

      if (!result) {
        throw new AppError(404, "Product not found");
      }

      logger.info("Product updated", { productId: id });
      return convertDbToApi(result);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error updating product", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new AppError(500, "Failed to update product");
    }
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      const productsCollection = getProductsCollection();

      const result = await productsCollection.deleteOne({
        _id: new ObjectId(id),
      });

      if (result.deletedCount === 0) {
        throw new AppError(404, "Product not found");
      }

      logger.info("Product deleted", { productId: id });
      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error deleting product", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new AppError(500, "Failed to delete product");
    }
  }

  async decreaseInventory(productId: string, quantity: number): Promise<void> {
    try {
      const productsCollection = getProductsCollection();

      const result = await productsCollection.findOneAndUpdate(
        { _id: new ObjectId(productId), inventory: { $gte: quantity } },
        { $inc: { inventory: -quantity } },
        { returnDocument: "after" },
      );

      if (!result) {
        throw new AppError(400, "Insufficient inventory");
      }

      logger.info("Inventory decreased", { productId, quantity });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error decreasing inventory", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new AppError(500, "Failed to update inventory");
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const categoriesCollection = getCategoriesCollection();
      const categories = await categoriesCollection.find({}).toArray();
      return categories.map((c) => c.name);
    } catch (error) {
      logger.error("Error fetching categories", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return [];
    }
  }
}

export default new ProductService();
