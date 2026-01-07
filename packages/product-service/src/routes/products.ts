import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import {
  validate,
  createProductSchema,
  asyncHandler,
  AppError,
  logger,
} from "@e-commerce/shared";

export const router = Router();

router.get(
  "/products",
  asyncHandler(async (req: Request, res: Response) => {
    const db = (req as any).db;
    const { search, category, page = 1, limit = 20 } = req.query;

    const filter: any = {};
    if (search) {
      filter.$text = { $search: search as string };
    }
    if (category) {
      filter.category = category;
    }

    const products = await db
      .collection("products")
      .find(filter)
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .limit(parseInt(limit as string))
      .toArray();

    const total = await db.collection("products").countDocuments(filter);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      },
      timestamp: new Date().toISOString(),
    });
  }),
);

router.get(
  "/products/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const db = (req as any).db;
    const product = await db
      .collection("products")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!product) {
      throw new AppError(404, "Product not found", "NOT_FOUND");
    }

    res.json({
      success: true,
      data: product,
      timestamp: new Date().toISOString(),
    });
  }),
);

router.post(
  "/products",
  asyncHandler(async (req: Request, res: Response) => {
    const db = (req as any).db;
    const data = validate(createProductSchema, req.body);

    const result = await db
      .collection("products")
      .insertOne({ ...data, createdAt: new Date(), updatedAt: new Date() });

    logger.info("Product created", { productId: result.insertedId });

    res
      .status(201)
      .json({
        success: true,
        data: { id: result.insertedId, ...data },
        timestamp: new Date().toISOString(),
      });
  }),
);
