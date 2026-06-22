import { pool } from "./db.js";
import { migrate } from "./migrations.js";
import { closeDatabase } from "./db.js";

try {
  await migrate(pool);
  console.log("AEON database migrations applied.");
} finally {
  await closeDatabase();
}
