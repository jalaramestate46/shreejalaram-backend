import { Router } from "express";
import { createReview, getReviews } from "../controllers/review.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createReviewSchema } from "../validators/review.validators.js";

export const reviewRouter = Router();

reviewRouter.get("/", getReviews);
reviewRouter.post("/", validate(createReviewSchema), createReview);
