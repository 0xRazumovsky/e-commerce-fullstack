import { Pool } from "pg";
import { logger } from "@e-commerce/shared";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function initDatabase(): Promise<void> {
  try {
    const client = await pool.connect();

    await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL,
                total DECIMAL(10, 2) NOT NULL,
                status VARCHAR(50) DEFAULT "penging",
                shipping_address JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

    await client.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                product_id UUID NOT NULL,
                quantity INTEGER NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

    await client.query(`
            CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
            CREATE INDEX IF NOT EXISTS idx_orders_items_order_id ON order_items(order_id);
            `);

    client.release();
    logger.info("Order database initialized successfully");
  } catch (error) {
    logger.error("Database initialization error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export default pool;
