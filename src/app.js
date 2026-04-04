import express from "express";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { adminPanelRouter } from "./routes/admin.panel.routes.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { ensureDbConnected } from "./middlewares/db.middleware.js";
import { globalLimiter, securityMiddleware } from "./middlewares/security.middleware.js";
import { getRobotsTxt, getSitemapXml } from "./controllers/seo.controller.js";

export const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.set("trust proxy", 1);

if (env.nodeEnv !== "test") {
  app.use(morgan(env.isProd ? "combined" : "dev"));
}

app.use(globalLimiter);
app.use(securityMiddleware);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(uploadsDir));

app.use((req, res, next) => {
  if (req.path.length > 1 && req.path.endsWith("/")) {
    const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    return res.redirect(301, req.path.slice(0, -1).toLowerCase() + query);
  }

  return next();
});

// Ensure database is connected
app.use(ensureDbConnected);


app.get("/robots.txt", getRobotsTxt);
app.get("/sitemap.xml", getSitemapXml);

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Shree Jalaram Estate backend is running",
    docs: {
      health: "/health",
      api: "/api",
    },
  });
});

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "API is healthy" });
});

app.get("/api", (_req, res) => {
  res.json({
    success: true,
    message: "API root",
    endpoints: [
      "/api/users",
      "/api/properties",
      "/api/projects",
      "/api/reviews",
      "/api/content",
      "/api/inquiries",
      "/api/favorites",
      "/api/seo",
    ],
  });
});

app.use("/api", apiRouter);
app.use("/admin", adminPanelRouter);

app.use(notFoundHandler);
app.use(errorHandler);
