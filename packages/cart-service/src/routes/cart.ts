import { Router, Request, Response } from "express";
import axios from "axios";
import {
  validate,
  addToCartSchema,
  asyncHandler,
  AppError,
  logger,
} from "packages/shared";

export const cartRoutes = Router();

const CART_KEY = (userId: string) => `cart:${userId}`;
const PRODUCT_CACHE_KEY = (productId: string) => `product:${productId}`;

cartRoutes.get(
  "/cart/:userId",
  asyncHandler(async (req: Request, res: Response) => {
    const redis = (req as any).redis;
    const userId = req.params.userId;

    if (req.user?.sub !== userId) {
      throw new AppError(403, "Forbidden", "FORBIDDEN");
    }

    const cartData = await redis.get(CART_KEY(userId!));
    const cart = cartData ? JSON.parse(cartData) : { items: [], total: 0 };

    res.json({
      success: true,
      data: cart,
      timestamp: new Date().toISOString(),
    });
  }),
);

cartRoutes.post(
  "/cart/:userId/items",
  asyncHandler(async (req: Request, res: Response) => {
    const redis = (req as any).redis;
    const userId = req.params.userId;

    if (req.user?.sub !== userId) {
      throw new AppError(403, "Forbidden", "FORBIDDEN");
    }

    const data = validate(addToCartSchema, req.body);

    // Product details
    let product = await redis.get(PRODUCT_CACHE_KEY(data.productId));
    if (!product) {
      const response = await axios.get(
        `${process.env.PRODUCT_SERVICE_URL}/products/${data.productId}`,
      );
      product = response.data.data;
      await redis.setEx(
        PRODUCT_CACHE_KEY(data.productId),
        3600,
        JSON.stringify(product),
      );
    } else {
      product = JSON.parse(product);
    }

    // Current cart
    const cartData = await redis.get(CART_KEY(userId!));
    const cart = cartData ? JSON.parse(cartData) : { items: [], total: 0 };

    // Check inventory
    if (product.inventory < data.quantity) {
      throw new AppError(
        400,
        "Insufficient inventory",
        "INSUFFICIENT_INVENTORY",
      );
    }

    // Add or update
    const existingItem = cart.items.find(
      (item: any) => item.productId === data.productId,
    );
    if (existingItem) {
      existingItem.quantity += data.quantity;
    } else {
      cart.items.push({
        productId: data.productId,
        quantity: data.quantity,
        price: product.price,
      });
    }

    // Calculate total
    cart.total = cart.items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0,
    );

    // Save cart
    await redis.setEx(CART_KEY(userId!), 86400 * 7, JSON.stringify(cart));

    logger.info("Item added to cart", {
      userId,
      productId: data.productId,
      quantity: data.quantity,
    });

    res.json({
      success: true,
      data: cart,
      timestamp: new Date().toISOString(),
    });
  }),
);

cartRoutes.delete(
  "/cart/:userId",
  asyncHandler(async (req: Request, res: Response) => {
    const redis = (req as any).redis;
    const userId = req.params.userId;

    if (req.user?.sub !== userId) {
      throw new AppError(403, "Forbidden", "FORBIDDEN");
    }

    await redis.del(CART_KEY(userId!));

    logger.info("Cart cleared", { userId });

    res.json({
      success: true,
      data: { message: "Cart cleared" },
      timestamp: new Date().toISOString(),
    });
  }),
);
