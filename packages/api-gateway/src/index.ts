import express, {Request, Response, NextFunction} from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import proxy from "express-http-proxy";
import {v4 as uuidv4} from "uuid";
import { logger, errorHandler, authMiddleware } from "@e-commerce/shared/index";

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Add correlation ID
app.use((req: Request, res: Response, next: NextFunction) => {
    req.correlationId = req.headers["x-correlation-id"] as string || uuidv4();
    res.setHeader("x-correlation-id", req.correlationId);
    next();
});

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info("HTTP Request", {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            correlationId: req.correlationId,
        });
    });
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
    limit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
    message: "Too many requests from this IP",
});
app.use(limiter);

// Health check (no auth required)
app.get('/health', async (req: Request, res: Response) => {
    try {
        const health: {
            status: string;
            timestamp: string;
            uptime: number;
            services: Record<string, "up" | "down">;
        } = {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            services: {},
        };
        
        const services = [
            {name: "user-service", url: process.env.USER_SERVICE_URL},
            {name: "order-service", url: process.env.ORDER_SERVICE_URL},
            {name: "product-service", url: process.env.PRODUCT_SERVICE_URL},
            {name: "payment-service", url: process.env.PAYMENT_SERVICE_URL},
        ];

        for (const service of services) {
            try {
                const response = await fetch(`${service.url}/health`, {
                    timeout: 500,
                } as any);
                health.services[service.name] = response.ok ? "up" : "down";
            } catch (error) {
                health.services[service.name] = "down";
            }
        }

        res.json(health);
    } catch (error) {
        res.status(500).json({
            status: "unhealthy",
            error: error instanceof Error ? error.message : "unknown error",
        });
    }
});

// Auth routes (no middleware required)
app.use("/api/auth", proxy(process.env.USER_SERVICE_URL || "http://localhost:3001"));

// Protected routes
app.use("/api/users", authMiddleware, proxy(process.env.USER_SERVICE_URL || "http://localhost:3001"));
app.use("/api/products",proxy(process.env.PRODUCT_SERVICE_URL || "http://localhost:3002"));
app.use("/api/cart", authMiddleware, proxy(process.env.CART_SERVICE_URL || "http://localhost:3003"));
app.use('/api/orders', authMiddleware, proxy(process.env.ORDER_SERVICE_URL || "http://localhost:3004"));
app.use("/api/payments", authMiddleware, proxy(process.env.PAYMENT_SERVICE_URL || "http://localhost:3005"));

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: "Route not found",
        timestamp: new Date().toISOString(),
    });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`, {serviceName: "api-gateway"});
});

// Graceful shutdown
process.on("SIGTERM", () => {
    logger.info("SIGTERM received, shutting down gracefully");
    process.exit(0);
})

