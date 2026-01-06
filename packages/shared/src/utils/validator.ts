import { email, z } from "zod";

export const userRegistrationSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
});

export const userLoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const createProductSchema = z.object({
  name: z.string().min(2),
  description: z.string(),
  price: z.number().positive(),
  inventory: z.number().int().nonnegative(),
  category: z.string(),
  images: z.array(z.url()).optional(),
});

export const addToCartSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
});

export const createOrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    })
  ),
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string().optional(),
    postalCode: z.string(),
    conutry: z.string(),
  }),
});

export const createPaymentSchema = z.object({
  orderId: z.string(),
  amount: z.number().positive(),
  paymentMethodId: z.string(),
});
