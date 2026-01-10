import { v4 as uuidv4 } from "uuid";
import pool from "../config/database";
import {
  AppError,
  Order,
  OrderItem,
  Address,
  logger,
} from "@e-commerce/shared";
