import { Content } from "../models/Content.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/apiResponse.js";

const defaultHomeStory = {
  kicker: "Premium Real Estate Solutions",
  title: "Your Dream Property Awaits Here",
  description: "Discover curated properties in Surat's prime locations.",
  primaryLabel: "Explore Properties",
  primaryPath: "/search",
  secondaryLabel: "Talk to Advisor",
  secondaryPath: "/contactus",
  image: "/house.png",
};

const defaultAboutStory = {
  kicker: "About The Story Behind Us",
  title: "We shape spaces that stand for quality, trust, and long-term value.",
  intro:
    "Shree Jalaram Estate Agency is a dynamic real estate organization committed to delivering thoughtfully designed, high-quality developments across residential and commercial segments.",
  details:
    "With over 14 years of industry experience, our expertise spans private projects, commercial infrastructure, and regulation-compliant developments.",
  stats: [
    { value: "100+", label: "Delivered Projects" },
    { value: "14+ Years", label: "of Industry Excellence" },
    { value: "25", label: "Award-winning Agents" },
  ],
  ctaLabel: "Know More About Us",
  ctaPath: "/aboutus",
  heroImage: "/house.png",
  heroImageAlt: "Shree Jalaram Estate workspace",
  insetImage: "/Logo.png",
  insetImageAlt: "Shree Jalaram Estate Agency",
};

const defaultContactInfo = {
  email: "shreejalarmestateagency@gmail.com",
  phone: "+91 98980 82218",
  address: "117, Mahalaxmi Square, Near L.P Savani Circle, Adajan, Surat, Gujarat 395009",
  facebook: "",
  instagram: "",
  whatsapp: "https://wa.me/919898082218",
  youtube: "",
};

const defaultSeoSettings = {
  home: {
    title: "Property Dealer In Surat For Residential, Commercial And Investment Opportunities",
    description:
      "Explore trusted residential plots, commercial spaces, premium projects, and local real estate guidance in Surat with Shree Jalaram Estate Agency.",
  },
  projects: {
    title: "Real Estate Projects In Surat",
    description:
      "Browse ongoing and completed real estate projects in Surat with location details, amenities, brochure access, and expert support.",
  },
  aboutus: {
    title: "About Shree Jalaram Estate Agency",
    description:
      "Learn about Shree Jalaram Estate Agency, our experience in Surat real estate, project advisory, and client-first service approach.",
  },
  contactus: {
    title: "Contact Shree Jalaram Estate Agency",
    description:
      "Call, email, or visit Shree Jalaram Estate Agency in Surat for property inquiries, site visits, project details, and investment guidance.",
  },
  search: {
    title: "Search Properties In Surat",
    description:
      "Search properties for buy and rent in Surat using filters for property type, category, BHK, and location.",
  },
  residential: {
    title: "Residential Properties In Surat",
    description:
      "Discover residential properties in Surat including apartments, bungalows, plots, and farmhouses with trusted advisory support.",
  },
  commercial: {
    title: "Commercial Properties In Surat",
    description:
      "Explore commercial properties in Surat including shops, offices, showrooms, and commercial plots for business and investment needs.",
  },
  reviews: {
    title: "Client Reviews For Shree Jalaram Estate Agency",
    description:
      "Read reviews from property buyers and investors who worked with Shree Jalaram Estate Agency in Surat.",
  },
};

const defaultSearchSettings = {
  pageTitle: "Search Properties In Surat",
  pageDescription:
    "Find residential and commercial properties with filters for buy, rent, BHK, location, and category.",
  heroImage: "",
  transactionTypeOptions: ["Buy", "Rent"],
  propertyTypeOptions: ["Residential", "Commercial"],
  categoryResidential: ["Apartment", "Bungalows", "Farmhouses", "Plot", "PG"],
  categoryCommercial: ["Shop", "Commercial plots", "Showrooms", "Office"],
  showPropertySubtype: false,
  showBathrooms: false,
  propertySubtypeResidential: ["Apartment", "Bungalows", "Farmhouses", "Plot"],
  propertySubtypeCommercial: ["Shop", "Commercial plots", "Showrooms", "Office"],
  bhkOptions: ["1", "2", "3", "4", "5"],
  bathroomOptions: ["1", "2", "3"],
};

const defaultInquirySettings = {
  developedByLabel: "Developed by",
  developedByDefault: "Shree Jalaram Estate Agency",
  cardTitle: "Please share your contact",
  buttonLabel: "Get Offer",
  note: "Limited time offers available",
};

export const getAboutStory = asyncHandler(async (_req, res) => {
  const content = await Content.findOneAndUpdate(
    { key: "about.story" },
    { $setOnInsert: { payload: defaultAboutStory } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return ok(res, content?.payload || defaultAboutStory, "About story fetched");
});

export const getTestimonials = asyncHandler(async (_req, res) => {
  const content = await Content.findOne({ key: "testimonials.list" }).lean();
  return ok(res, content?.payload || [], "Testimonials fetched");
});

export const getHomeStory = asyncHandler(async (_req, res) => {
  const content = await Content.findOneAndUpdate(
    { key: "home.story" },
    { $setOnInsert: { payload: defaultHomeStory } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return ok(res, content?.payload || defaultHomeStory, "Home story fetched");
});

export const getSeoSettings = asyncHandler(async (_req, res) => {
  const content = await Content.findOneAndUpdate(
    { key: "seo.settings" },
    { $setOnInsert: { payload: defaultSeoSettings } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return ok(res, content?.payload || defaultSeoSettings, "SEO settings fetched");
});

export const getSearchSettings = asyncHandler(async (_req, res) => {
  const content = await Content.findOneAndUpdate(
    { key: "search.settings" },
    { $setOnInsert: { payload: defaultSearchSettings } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return ok(res, { ...defaultSearchSettings, ...(content?.payload || {}) }, "Search settings fetched");
});

export const getInquirySettings = asyncHandler(async (_req, res) => {
  const content = await Content.findOneAndUpdate(
    { key: "inquiry.settings" },
    { $setOnInsert: { payload: defaultInquirySettings } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return ok(res, { ...defaultInquirySettings, ...(content?.payload || {}) }, "Inquiry settings fetched");
});

export const getContactInfo = asyncHandler(async (_req, res) => {
  const content = await Content.findOneAndUpdate(
    { key: "contact.info" },
    { $setOnInsert: { payload: defaultContactInfo } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return ok(res, { ...defaultContactInfo, ...(content?.payload || {}) }, "Contact info fetched");
});
