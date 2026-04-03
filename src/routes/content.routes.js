import { Router } from "express";
import { getAboutStory, getContactInfo, getHomeStory, getInquirySettings, getSearchSettings, getSeoSettings, getTestimonials } from "../controllers/content.controller.js";

export const contentRouter = Router();

contentRouter.get("/about", getAboutStory);
contentRouter.get("/home", getHomeStory);
contentRouter.get("/inquiry", getInquirySettings);
contentRouter.get("/search", getSearchSettings);
contentRouter.get("/seo", getSeoSettings);
contentRouter.get("/contact", getContactInfo);
contentRouter.get("/testimonials", getTestimonials);
