import { Router } from "express";
import {
  createProperty,
  deleteProperty,
  getAllProperties,
  getPropertyById,
  searchProperties,
  toggleFavoriteProperty,
  updateProperty,
} from "../controllers/property.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { propertySchema } from "../validators/property.validators.js";

export const propertyRouter = Router();

propertyRouter.post("/", getAllProperties);
propertyRouter.get("/search", searchProperties);
propertyRouter.get("/:id", getPropertyById);
propertyRouter.post("/create", requireAuth, validate(propertySchema), createProperty);
propertyRouter.patch("/:id", requireAuth, validate(propertySchema.partial()), updateProperty);
propertyRouter.delete("/:id", requireAuth, deleteProperty);
propertyRouter.post("/:id/favorite", requireAuth, toggleFavoriteProperty);
