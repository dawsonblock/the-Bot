import "dotenv/config";
import { buildApp } from "./api/app.js";

const app = await buildApp();
const port = Number(process.env.PORT ?? 3000);

try {
  await app.listen({ host: "0.0.0.0", port });
  console.log(`AEON listening on http://localhost:${port}`);
} catch (error) {
  console.error("Failed to start AEON", error);
  process.exit(1);
}
