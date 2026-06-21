import "dotenv/config";
import { buildApp } from "./api/app.js";
import { closeDatabase } from "./db/db.js";

const app = await buildApp();
const port = Number(process.env.PORT ?? 3000);
let shuttingDown = false;

try {
  await app.listen({ host: "0.0.0.0", port });
  console.log(`AEON listening on http://localhost:${port}`);
} catch (error) {
  console.error("Failed to start AEON", error);
  try {
    await closeDatabase();
  } finally {
    process.exit(1);
  }
}

async function shutdown(exitCode: 0 | 1) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  let finalExitCode = exitCode;

  try {
    await app.close();
  } catch (error) {
    console.error("Failed to shut down AEON", error);
    finalExitCode = 1;
  }

  try {
    await closeDatabase();
  } catch (error) {
    console.error("Failed to close database pool", error);
    finalExitCode = 1;
  } finally {
    process.exit(finalExitCode);
  }
}

process.on("SIGINT", () => {
  void shutdown(0);
});

process.on("SIGTERM", () => {
  void shutdown(0);
});
