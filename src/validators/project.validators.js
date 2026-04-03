import { z } from "zod";

const faqItemSchema = z.object({
  question: z.string().min(3),
  answer: z.string().min(3),
});

export const projectSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3).optional(),
  description: z.string().min(10),
  status: z.enum(["ONGOING", "COMPLETED"]),
  location: z.string().min(3),
  address: z.string().min(1),
  projectType: z.string().min(3).optional(),
  developedBy: z.string().min(3).optional(),
  images: z.array(z.string()).optional(),
  brochureUrl: z.string().url().optional().or(z.literal("")),
  overview: z.object({
    heading: z.string().min(3).optional().or(z.literal("")),
    highlight: z.string().min(3).optional().or(z.literal("")),
    projectArea: z.string().min(1).optional().or(z.literal("")),
    configurations: z.string().min(1).optional().or(z.literal("")),
    reraStatus: z.string().min(1).optional().or(z.literal("")),
  }).optional(),
  amenities: z.array(z.string().min(1)).optional(),
  locationDescription: z.string().optional(),
  virtualTourUrl: z.string().url().optional().or(z.literal("")),
  virtualTourTitle: z.string().optional(),
  virtualTourDescription: z.string().optional(),
  faqs: z.array(faqItemSchema).optional(),
  contactTitle: z.string().min(3).optional(),
  contactNote: z.string().min(3).optional(),
  contactButtonLabel: z.string().min(2).optional(),
});
