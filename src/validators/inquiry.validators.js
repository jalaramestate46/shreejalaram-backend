import { z } from "zod";

export const inquirySchema = z.object({
  type: z.enum(["contact", "project"]).default("contact"),
  name: z.string().min(1),
  mobile: z.string().min(10),
  email: z.string().email().optional(),
  message: z.string().min(3),
  consent: z.boolean().refine((value) => value, {
    message: "Consent is required",
  }),
  projectId: z.string().optional(),
});
