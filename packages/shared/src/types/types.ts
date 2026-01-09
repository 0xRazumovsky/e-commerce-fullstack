export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  inventory: string; // ?
  category: string;
  images: string[]; //?
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  shippingAddress: Address;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  stripePaymentIntentId: string;
  createdAt: Date;
  updatedAt: Date;
}
