import { connectDB } from "../config/db.js";

let dbConnected = false;

export const ensureDbConnected = async (req, res, next) => {
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
      console.log("Database connected");
    } catch (error) {
      console.error("Database connection failed:", error?.message || error);
      return res.status(503).json({
        success: false,
        message: "Service temporarily unavailable",
      });
    }
  }
  next();
};
