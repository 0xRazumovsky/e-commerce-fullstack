import express, { Request, Response } from "express";
import { initDatabase } from "./config/database.js";
import {
  errorHandler,
  asyncHandler,
  logger,
} from "@e-commerce/shared/index.js";
import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/users.js";

const app = express();
const PORT = process.env.SERVICE_PORT || 3001;

app.use(express.json());

// DB
initDatabase().catch((err) => {
  logger.error("Failed to initialize database", { error: err.message });
  process.exit(1);
});

// Routes
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "healthy", service: "user-service" });
});

app.use("/auth", authRoutes);
app.use("/users", userRoutes);

// Error
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`User service running on port ${PORT}`);
});
