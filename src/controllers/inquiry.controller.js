import { Inquiry } from "../models/Inquiry.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";

export const createInquiry = asyncHandler(async (req, res) => {
  const inquiry = await Inquiry.create({
    ...req.body,
    mobile: String(req.body.mobile).replace(/\D/g, "").slice(0, 10),
  });

  return ok(res, inquiry, "Inquiry submitted successfully", 201);
});
