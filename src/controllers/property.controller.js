import { Property } from "../models/Property.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";

function normalizePropertyPayload(payload) {
  return {
    ...payload,
    price: Number(payload.price || 0),
    sqt: Number(payload.sqt || 0),
    bedrooms: payload.bedrooms !== undefined && payload.bedrooms !== "" ? Number(payload.bedrooms) : null,
    bathrooms: payload.bathrooms !== undefined && payload.bathrooms !== "" ? Number(payload.bathrooms) : null,
    images: Array.isArray(payload.images) ? payload.images : [],
  };
}

export const getAllProperties = asyncHandler(async (req, res) => {
  const userId = req.body?.userId;
  const filter = userId ? { agent: userId } : {};

  const properties = await Property.find(filter).sort({ createdAt: -1 }).lean();
  return ok(res, properties, "Properties fetched");
});

export const searchProperties = asyncHandler(async (req, res) => {
  const {
    title,
    transactionType,
    propertyType,
    category,
    subCategory,
    bedrooms,
    bathrooms,
    location,
  } = req.query;

  const filter = {};

  if (title) {
    filter.$or = [
      { title: new RegExp(title, "i") },
      { location: new RegExp(title, "i") },
      { address: new RegExp(title, "i") },
      { description: new RegExp(title, "i") },
    ];
  }

  if (transactionType) filter.transactionType = transactionType;
  if (propertyType) filter.propertyType = propertyType;
  if (category) filter.category = category;
  if (subCategory) filter.subCategory = subCategory;
  if (location) filter.location = new RegExp(location, "i");
  if (bedrooms) filter.bedrooms = Number(bedrooms);
  if (bathrooms) filter.bathrooms = Number(bathrooms);

  const properties = await Property.find(filter).sort({ createdAt: -1 }).lean();
  return ok(res, properties, "Search results fetched");
});

export const getPropertyById = asyncHandler(async (req, res) => {
  const rawId = String(req.params.id || "");
  const propertyId = rawId.split("-")[0];

  const property = await Property.findById(propertyId)
    .populate("agent", "_id username fullName email mobile")
    .lean();

  if (!property) {
    throw new ApiError(404, "Property not found");
  }

  return ok(res, property, "Property fetched");
});

export const createProperty = asyncHandler(async (req, res) => {
  const payload = normalizePropertyPayload(req.body);
  if (req.user) {
    payload.agent = req.user._id;
  }

  const property = await Property.create(payload);
  return ok(res, property, "Property created", 201);
});

export const updateProperty = asyncHandler(async (req, res) => {
  const payload = normalizePropertyPayload(req.body);
  const property = await Property.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  });

  if (!property) {
    throw new ApiError(404, "Property not found");
  }

  return ok(res, property, "Property updated");
});

export const deleteProperty = asyncHandler(async (req, res) => {
  const property = await Property.findByIdAndDelete(req.params.id);

  if (!property) {
    throw new ApiError(404, "Property not found");
  }

  await User.updateMany({ favorites: property._id }, { $pull: { favorites: property._id } });

  return ok(res, true, "Property deleted");
});

export const toggleFavoriteProperty = asyncHandler(async (req, res) => {
  const propertyId = req.params.id;

  if (!propertyId) {
    throw new ApiError(400, "Invalid property id");
  }

  const property = await Property.findById(propertyId);
  if (!property) {
    throw new ApiError(404, "Property not found");
  }

  const user = await User.findById(req.user._id);
  const hasFavorite = user.favorites.some((item) => item.toString() === propertyId);

  if (hasFavorite) {
    user.favorites = user.favorites.filter((item) => item.toString() !== propertyId);
  } else {
    user.favorites.push(property._id);
  }

  await user.save();

  return ok(res, { favorite: !hasFavorite }, hasFavorite ? "Removed from favorites" : "Added to favorites");
});

export const getFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("favorites");
  return ok(res, user?.favorites || [], "Favorites fetched");
});
