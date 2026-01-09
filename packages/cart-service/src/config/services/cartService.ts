import axios from "axios";
import { getRedisClient } from "../redis";
import { AppError, CartItem, Cart, logger } from "packages/shared/dist";

export class CartService {
  #PRODUCT_SERVICE_URL =
    process.env.PRODUCT_SERVICE_URL || "http://localhost:3002";

  async getCart(userId: string): Promise<Cart | null> {
    try {
      const redis = getRedisClient();
      const cartKey = `cart:${userId}`;
      const cartData = await redis.get(cartKey);

      if (!cartData) {
        return null;
      }

      return JSON.parse(cartData) as Cart;
    } catch (error) {
      logger.error("Error getting cart", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
      });
      return null;
    }
  }

  async addToCart(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<Cart> {
    try {
      const redis = getRedisClient();
      const cartKey = `cart:${userId}`;

      // Verify product
      const productResponse = await axios.get(
        `${this.#PRODUCT_SERVICE_URL}/products/${productId}`,
      );
      const product = productResponse.data;

      if (product.inventory < quantity) {
        throw new AppError(400, "Insufficient inventory");
      }

      let cart = await this.getCart(userId);
      if (!cart) {
        cart = {
          userId,
          items: [],
          total: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      const existingItem = cart.items.find(
        (item) => item.productId === productId,
      );
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({ productId, quantity, price: product.price });
      }

      cart.total = cart.items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      );
      cart.updatedAt = new Date().toISOString();

      await redis.setEx(cartKey, 86400, JSON.stringify(cart));
      logger.info("Item added to cart", { userId, productId, quantity });

      return cart;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error adding to cart", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new AppError(500, "Failed to add item to cart");
    }
  }

  async removeFromCart(userId: string, productId: string): Promise<Cart> {
    try {
      const redis = getRedisClient();
      const cartKey = `cart:${userId}`;

      let cart = await this.getCart(userId);
      if (!cart) {
        throw new AppError(404, "Cart not found");
      }

      cart.items = cart.items.filter((item) => item.productId !== productId);
      cart.total = cart.items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      );
      cart.updatedAt = new Date().toISOString();

      if (cart.items.length === 0) {
        await redis.del(cartKey);
      } else {
        await redis.setEx(cartKey, 86400, JSON.stringify(cart));
      }

      logger.info("Item removed from cart", { userId: productId });
      return cart;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error removing from cart", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new AppError(500, "Failed to remove item from cart");
    }
  }

  async updateCartItem(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<Cart> {
    try {
      const redis = getRedisClient();
      const cartKey = `cart:${userId}`;

      let cart = await this.getCart(userId);
      if (!cart) {
        throw new AppError(404, "Cart not found");
      }

      const item = cart.items.find((i) => i.productId === productId);
      if (!item) {
        throw new AppError(404, "Item not found in cart");
      }

      if (quantity <= 0) {
        return this.removeFromCart(userId, productId);
      }

      item.quantity = quantity;
      cart.total = cart.items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      );
      cart.updatedAt = new Date().toISOString();

      await redis.setEx(cartKey, 86400, JSON.stringify(cart));
      logger.info("Cart item updated", { userId, productId, quantity });

      return cart;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error("Error updating cart item", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new AppError(500, "Failed to update cart item");
    }
  }

  async clearCart(userId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const cartKey = `cart:${userId}`;
      await redis.del(cartKey);
      logger.info("Cart cleared", { userId });
    } catch (error) {
      logger.error("Error clearing cart", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new AppError(500, "Failed to clear cart");
    }
  }
}

export default new CartService();
