import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["contact", "project"],
      default: "contact",
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    consent: {
      type: Boolean,
      default: false,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
  },
  { timestamps: true }
);

export const Inquiry = mongoose.model("Inquiry", inquirySchema);
