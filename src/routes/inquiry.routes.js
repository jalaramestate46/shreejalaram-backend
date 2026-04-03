import { Router } from "express";
import { createInquiry } from "../controllers/inquiry.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { inquirySchema } from "../validators/inquiry.validators.js";

export const inquiryRouter = Router();

inquiryRouter.post("/", validate(inquirySchema), createInquiry);
