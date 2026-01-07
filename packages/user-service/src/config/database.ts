import { Pool } from "pg";
import { logger } from "@e-commerce/shared/index.js";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function initDatabase() {
  try {
    const client = await pool.connect();

    // Users table
    await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                first_name VARCHAR(255) NOT NULL,
                last_name VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT "user",
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            `);

    // Sessions table
    await client.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id UUID PRIMARY KET DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(500) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            `);

    client.release();
    logger.info("Database initialized successfully");
  } catch (error) {
    logger.error("Database initialization error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
