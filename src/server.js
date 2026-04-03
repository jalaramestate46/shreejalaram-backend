import { app } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";

const RETRY_MS = 5000;

async function connectWithRetry() {
  try {
    await connectDB();
    // eslint-disable-next-line no-console
    console.log("Database connected");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Database connection failed. Retrying in ${RETRY_MS / 1000}s...`, error?.message || error);
    setTimeout(connectWithRetry, RETRY_MS);
  }
}

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running on http://localhost:${env.port}`);
  connectWithRetry();
});
