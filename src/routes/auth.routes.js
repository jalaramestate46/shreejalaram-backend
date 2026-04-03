import { Router } from "express";
import {
  deleteUser,
  getUsers,
  login,
  logout,
  refreshToken,
  register,
  updateUser,
} from "../controllers/auth.controller.js";
import { authLimiter } from "../middlewares/security.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  updateUserSchema,
} from "../validators/auth.validators.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

export const authRouter = Router();

authRouter.get("/", getUsers);
authRouter.post("/register", authLimiter, validate(registerSchema), register);
authRouter.post("/login", authLimiter, validate(loginSchema), login);
authRouter.post("/logout", logout);
authRouter.post("/refreshToken", validate(refreshTokenSchema), refreshToken);
authRouter.put("/:id", requireAuth, validate(updateUserSchema), updateUser);
authRouter.patch("/:id", requireAuth, validate(updateUserSchema.partial()), updateUser);
authRouter.delete("/:id", requireAuth, deleteUser);
