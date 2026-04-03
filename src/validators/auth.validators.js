import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(1),
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  mobile: z.string().min(10),
  role: z.enum(["user", "admin"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const updateUserSchema = z.object({
  username: z.string().min(1),
  fullName: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(10),
  avatar: z.string().url().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
