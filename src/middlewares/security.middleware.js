import helmet from "helmet";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const mongoSanitizeSafe = (req, _res, next) => {
  // Express 5 may expose req.query via a getter-only property.
  // Sanitize in-place to avoid reassigning req.query and crashing.
  ["body", "params", "headers", "query"].forEach((key) => {
    if (req[key] && typeof req[key] === "object") {
      mongoSanitize.sanitize(req[key]);
    }
  });

  next();
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
});

export const securityMiddleware = [
  helmet({
    crossOriginResourcePolicy: false,
  }),
  cors({
    origin: env.frontendOrigin,
    credentials: true,
  }),
  compression(),
  mongoSanitizeSafe,
  hpp(),
];
