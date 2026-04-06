import { connectDB } from "../config/db.js";
const PUBLIC_ROUTES = ["/", "/health", "/robots.txt", "/sitemap.xml", "/favicon.ico", "/favicon.png"];
const PUBLIC_ADMIN_GET_ROUTES = ["/admin", "/admin/signin", "/admin/signup"];

export const ensureDbConnected = async (req, res, next) => {
  // Skip DB connection for public routes
  if (PUBLIC_ROUTES.includes(req.path)) {
    return next();
  }

  // Let the admin entry pages render even if the database is temporarily unavailable.
  if ((req.method === "GET" || req.method === "HEAD") && PUBLIC_ADMIN_GET_ROUTES.includes(req.path)) {
    return next();
  }

  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection failed:", error?.message || error);
    return res.status(503).json({
      success: false,
      message: "Service temporarily unavailable",
    });
  }
};
