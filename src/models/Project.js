import mongoose from "mongoose";
import slugify from "slugify";

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["ONGOING", "COMPLETED"],
      required: true,
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
    projectType: {
      type: String,
      trim: true,
      default: "Premium Development",
    },
    developedBy: {
      type: String,
      trim: true,
      default: "Shree Jalaram Estate Agency",
    },
    images: {
      type: [String],
      default: [],
    },
    brochureUrl: {
      type: String,
      trim: true,
      default: "",
    },
    overview: {
      heading: {
        type: String,
        trim: true,
        default: "",
      },
      highlight: {
        type: String,
        trim: true,
        default: "",
      },
      projectArea: {
        type: String,
        trim: true,
        default: "Premium",
      },
      configurations: {
        type: String,
        trim: true,
        default: "Custom inquiry",
      },
      reraStatus: {
        type: String,
        trim: true,
        default: "",
      },
    },
    amenities: {
      type: [String],
      default: [],
    },
    locationDescription: {
      type: String,
      trim: true,
      default: "",
    },
    virtualTourUrl: {
      type: String,
      trim: true,
      default: "",
    },
    virtualTourTitle: {
      type: String,
      trim: true,
      default: "",
    },
    virtualTourDescription: {
      type: String,
      trim: true,
      default: "",
    },
    faqs: {
      type: [
        {
          question: {
            type: String,
            trim: true,
            required: true,
          },
          answer: {
            type: String,
            trim: true,
            required: true,
          },
        },
      ],
      default: [],
    },
    contactTitle: {
      type: String,
      trim: true,
      default: "Please share your contact",
    },
    contactNote: {
      type: String,
      trim: true,
      default: "Limited time offers available",
    },
    contactButtonLabel: {
      type: String,
      trim: true,
      default: "Get Offer",
    },
  },
  { timestamps: true }
);

projectSchema.pre("validate", function preValidate(next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }

  next();
});

export const Project = mongoose.model("Project", projectSchema);
