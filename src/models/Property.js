import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    transactionType: {
      type: String,
      enum: ["Buy", "Rent"],
      required: true,
      index: true,
    },
    propertyType: {
      type: String,
      enum: ["Residential", "Commercial"],
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    subCategory: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    sqt: {
      type: Number,
      required: true,
      min: 0,
    },
    bedrooms: {
      type: Number,
      min: 0,
      default: null,
    },
    bathrooms: {
      type: Number,
      min: 0,
      default: null,
    },
    images: {
      type: [String],
      default: [],
    },
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  { timestamps: true }
);

propertySchema.index({ title: "text", location: "text", address: "text", description: "text" });

export const Property = mongoose.model("Property", propertySchema);
