import { Router } from "express";
import { getFavorites } from "../controllers/property.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

export const favoriteRouter = Router();

favoriteRouter.get("/", requireAuth, getFavorites);
