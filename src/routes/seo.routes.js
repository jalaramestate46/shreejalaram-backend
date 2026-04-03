import { Router } from "express";
import { getSeoRoutes } from "../controllers/seo.controller.js";

export const seoRouter = Router();

seoRouter.get("/routes", getSeoRoutes);
