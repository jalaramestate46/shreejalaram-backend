import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { env } from "../config/env.js";

function toAuthPayload(user) {
  return {
    user: {
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      avatar: user.avatar || "",
    },
  };
}

function applyAuthCookies(res, accessToken, refreshToken) {
  const cookieBase = {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
  };

  res.cookie("accessToken", accessToken, {
    ...cookieBase,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieBase,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export const register = asyncHandler(async (req, res) => {
  const { username, fullName, email, password, mobile, role = "user" } = req.body;

  const existing = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username }],
  });

  if (existing) {
    throw new ApiError(409, "Email or username already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({
    username,
    fullName,
    email: email.toLowerCase(),
    mobile,
    passwordHash,
    role,
  });

  return ok(res, null, "Account created successfully", 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ sub: user._id.toString(), role: user.role });

  user.refreshToken = refreshToken;
  await user.save();

  applyAuthCookies(res, accessToken, refreshToken);

  return ok(
    res,
    {
      ...toAuthPayload(user),
      accessToken,
      refreshToken,
    },
    "Login successful"
  );
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;

  if (refreshToken) {
    await User.updateOne({ refreshToken }, { $set: { refreshToken: null } });
  }

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  return ok(res, true, "Logged out successfully");
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken || req.cookies?.refreshToken;

  if (!token) {
    throw new ApiError(401, "Refresh token required");
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token", { name: error.name });
  }

  const user = await User.findById(decoded.sub);
  if (!user || user.refreshToken !== token) {
    throw new ApiError(401, "Refresh token is invalid or revoked");
  }

  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const nextRefreshToken = signRefreshToken({ sub: user._id.toString(), role: user.role });

  user.refreshToken = nextRefreshToken;
  await user.save();

  applyAuthCookies(res, accessToken, nextRefreshToken);

  return res.status(200).json({
    accessToken,
    refreshToken: nextRefreshToken,
  });
});

export const getUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().select("-passwordHash -refreshToken").sort({ createdAt: -1 });
  return ok(res, users, "Users fetched");
});

export const updateUser = asyncHandler(async (req, res) => {
  const idOrUsername = req.params.id;

  const user = await User.findOne({
    $or: [{ _id: idOrUsername }, { username: idOrUsername }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.username = req.body.username;
  user.fullName = req.body.fullName;
  user.email = req.body.email.toLowerCase();
  user.mobile = req.body.mobile;
  if (req.body.avatar) {
    user.avatar = req.body.avatar;
  }

  await user.save();

  return ok(res, toAuthPayload(user).user, "Profile updated successfully");
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return ok(res, true, "User deleted successfully");
});
