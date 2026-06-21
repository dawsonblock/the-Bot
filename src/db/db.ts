import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required. Set it in your environment or .env file.");
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool);

export async function closeDatabase() {
  await pool.end();
}
