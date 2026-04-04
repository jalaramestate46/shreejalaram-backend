import { connectDB } from "../config/db.js";

let dbConnected = false;
const PUBLIC_ROUTES = ["/health", "/robots.txt", "/sitemap.xml"];

export const ensureDbConnected = (req, res, next) => {
  // Skip DB connection for public routes
  if (PUBLIC_ROUTES.includes(req.path)) {
    return next();
  }

  if (!dbConnected) {
    connectDB()
      .then(() => {
        dbConnected = true;
        console.log("Database connected");
        next();
      })
      .catch((error) => {
        console.error("Database connection failed:", error?.message || error);
        return res.status(503).json({
          success: false,
          message: "Service temporarily unavailable",
        });
      });
  } else {
    next();
  }
};
