import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables FIRST before anything else
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend/.env"),
  path.resolve(__dirname, "../.env"),
];

for (const envPath of envCandidates) {
  try {
    dotenv.config({ path: envPath, override: false });
    console.log(`Loaded env from: ${envPath}`);
  } catch (e) {
    // silently skip if file doesn't exist
  }
}

console.log("✓ Environment variables loaded");
console.log("MONGODB_URI set:", !!process.env.MONGODB_URI);
console.log("JWT_ACCESS_SECRET set:", !!process.env.JWT_ACCESS_SECRET);

// Import and export app
import { app } from "../src/app.js";

export default app;

