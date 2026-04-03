import { Review } from "../models/Review.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";

function makeAvatar(name) {
  const avatarName = encodeURIComponent((name || "Client").trim());
  return `https://ui-avatars.com/api/?name=${avatarName}&background=2563EB&color=fff&size=128`;
}

export const getReviews = asyncHandler(async (_req, res) => {
  const reviews = await Review.find().sort({ createdAt: -1 }).lean();
  return ok(res, reviews, "Reviews fetched");
});

export const createReview = asyncHandler(async (req, res) => {
  const review = await Review.create({
    ...req.body,
    phone: String(req.body.phone).replace(/\D/g, "").slice(0, 10),
    image: makeAvatar(req.body.name),
  });

  return ok(res, review, "Review submitted", 201);
});
