import { env } from "../config/env.js";

export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
}

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";

  return res.status(statusCode).json({
    success: false,
    message,
    errors: error.errors || null,
    ...(env.nodeEnv !== "production" ? { stack: error.stack } : {}),
  });
}
