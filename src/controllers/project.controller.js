import slugify from "slugify";
import { Project } from "../models/Project.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";

export const getProjects = asyncHandler(async (_req, res) => {
  const projects = await Project.find().sort({ createdAt: -1 }).lean();
  return ok(res, projects, "Projects fetched");
});

export const getProjectBySlugOrId = asyncHandler(async (req, res) => {
  const value = req.params.slugOrId;

  const filter = {
    $or: [{ _id: value }, { slug: value.toLowerCase() }],
  };

  const project = await Project.findOne(filter).lean();

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return ok(res, project, "Project fetched");
});

export const createProject = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    slug: req.body.slug || slugify(req.body.title, { lower: true, strict: true }),
    images: Array.isArray(req.body.images) ? req.body.images : [],
    amenities: Array.isArray(req.body.amenities) ? req.body.amenities : [],
    faqs: Array.isArray(req.body.faqs) ? req.body.faqs : [],
  };

  const project = await Project.create(payload);
  return ok(res, project, "Project created", 201);
});

export const updateProject = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    images: Array.isArray(req.body.images) ? req.body.images : undefined,
    amenities: Array.isArray(req.body.amenities) ? req.body.amenities : undefined,
    faqs: Array.isArray(req.body.faqs) ? req.body.faqs : undefined,
  };

  if (payload.title && !payload.slug) {
    payload.slug = slugify(payload.title, { lower: true, strict: true });
  }

  const project = await Project.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return ok(res, project, "Project updated");
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findByIdAndDelete(req.params.id);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return ok(res, true, "Project deleted");
});
