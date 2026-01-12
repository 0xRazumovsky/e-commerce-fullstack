import { Pool } from "pg";
import { logger } from "@e-commerce/shared";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function initDatabase(): Promise<void> {
  try {
    const client = await pool.connect();

    await client.query(`
            CREATE TABLE IF NOT EXISTS payments(
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL UNIQUE,
            amount DECIMAL(10, 2) NOT NULL,
            currency VARCHAR(3) DEFAULT "USD",
            status VARCHAR(50) DEFAULT "pending",
            stripe_payment_intent_id VARCHAR(255),
            payment_method_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

    await client.query(`
            CREATE TABLE IF NOT EXISTS refunds(
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            payment_id UUID NOT NULL REFERENCES payments(id),
            amount DECIMAL(10, 2) NOT NULL,
            reason VARCHAR(255),
            status VARCHAR(50) DEFAULT "pending",
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

    await client.query(`
            CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
            CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
            CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);`);

    client.release();
    logger.info("Payment database initialized successfully");
  } catch (error) {
    logger.error("Database initialization error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export default pool;
