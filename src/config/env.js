import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend/.env"),
  path.resolve(__dirname, "../../.env"),
];

for (const envPath of envCandidates) {
  dotenv.config({ path: envPath, override: false });
}

const required = ["MYSQL_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];

// Check and warn about missing variables (but don't throw to allow Vercel env vars)
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`⚠️  Missing environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT || 3000),
  mysqlUrl:
    process.env.MYSQL_URL
    || process.env.DATABASE_URL
    || "",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  siteUrl: process.env.SITE_URL || "https://jalaramestate.com",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "default-secret-key",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "default-refresh-secret",
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || "30d",
  uploadsDir: process.env.UPLOADS_DIR || "",
};
