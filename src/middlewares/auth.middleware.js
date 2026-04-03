import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { User } from "../models/User.js";

export const requireAuth = asyncHandler(async (req, res, next) => {
  const isAdminPage = req.originalUrl?.startsWith("/admin");
  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const cookieToken = req.cookies?.accessToken || null;
  const token = bearerToken || cookieToken;

  if (!token) {
    if (isAdminPage) {
      return res.redirect("/admin/signin");
    }

    throw new ApiError(401, "Authentication required");
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    if (isAdminPage) {
      return res.redirect("/admin/signin");
    }

    throw new ApiError(401, "Invalid or expired access token", { name: error.name });
  }

  const user = await User.findById(decoded.sub).select("-passwordHash -refreshToken");

  if (!user) {
    if (isAdminPage) {
      return res.redirect("/admin/signin");
    }

    throw new ApiError(401, "User not found for this session");
  }

  req.user = user;
  next();
});

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      if (req.originalUrl?.startsWith("/admin")) {
        return res.redirect("/admin/signin");
      }

      return next(new ApiError(403, "Insufficient permissions"));
    }

    next();
  };
};
