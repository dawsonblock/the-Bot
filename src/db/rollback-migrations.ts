import { pool } from "./db.js";
import { rollback } from "./migrations.js";
import { closeDatabase } from "./db.js";

try {
  await rollback(pool);
  console.log("AEON database migrations rolled back.");
} finally {
  await closeDatabase();
}
