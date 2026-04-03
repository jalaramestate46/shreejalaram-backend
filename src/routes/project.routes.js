import { Router } from "express";
import {
  createProject,
  deleteProject,
  getProjectBySlugOrId,
  getProjects,
  updateProject,
} from "../controllers/project.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { projectSchema } from "../validators/project.validators.js";

export const projectRouter = Router();

projectRouter.get("/", getProjects);
projectRouter.get("/:slugOrId", getProjectBySlugOrId);
projectRouter.post("/", requireAuth, requireRole("admin"), validate(projectSchema), createProject);
projectRouter.put("/:id", requireAuth, requireRole("admin"), validate(projectSchema.partial()), updateProject);
projectRouter.delete("/:id", requireAuth, requireRole("admin"), deleteProject);
