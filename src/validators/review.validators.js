import { z } from "zod";

export const createReviewSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  rating: z.number().min(1).max(5),
  testimonial: z.string().min(20),
});
