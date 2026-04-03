import { z } from "zod";

export const propertySchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  transactionType: z.enum(["Buy", "Rent"]),
  propertyType: z.enum(["Residential", "Commercial"]),
  category: z.enum([
    "Apartment",
    "Bungalows",
    "Farmhouses",
    "Plot",
    "Shop",
    "Commercial plots",
    "Showrooms",
    "Office",
  ]),
  subCategory: z.string().min(2),
  location: z.string().min(3),
  address: z.string().min(1),
  price: z.union([z.string(), z.number()]),
  sqt: z.union([z.string(), z.number()]),
  bedrooms: z.union([z.string(), z.number()]).optional(),
  bathrooms: z.union([z.string(), z.number()]).optional(),
  images: z.array(z.string()).optional(),
});

export const propertySearchSchema = z
  .object({
    title: z.string().optional(),
    transactionType: z.enum(["Buy", "Rent"]).optional(),
    propertyType: z.enum(["Residential", "Commercial"]).optional(),
    category: z.string().optional(),
    subCategory: z.string().optional(),
    bedrooms: z.union([z.string(), z.number()]).optional(),
    bathrooms: z.union([z.string(), z.number()]).optional(),
    location: z.string().optional(),
  })
  .strict();
