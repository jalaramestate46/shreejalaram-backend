import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import { Content } from "../models/Content.js";
import { Project } from "../models/Project.js";
import { Property } from "../models/Property.js";
import { Review } from "../models/Review.js";
import { User } from "../models/User.js";

const aboutStoryContent = {
  kicker: "About The Story Behind Us",
  title: "We shape spaces that stand for quality, trust, and long-term value.",
  intro:
    "Shree Jalaram Estate Agency is a dynamic real estate organization committed to delivering thoughtfully designed, high-quality developments across residential and commercial segments.",
  details:
    "With over 14 years of industry experience, our expertise spans private projects, commercial infrastructure, and regulation-compliant developments. Every project we undertake reflects our focus on structural integrity, smart planning, and lasting excellence.",
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

const homeStoryContent = {
  kicker: "Premium Real Estate Solutions",
  title: "Your Dream Property Awaits Here",
  description: "Discover curated properties in Surat's prime locations.",
  primaryLabel: "Explore Properties",
  primaryPath: "/search",
  secondaryLabel: "Talk to Advisor",
  secondaryPath: "/contactus",
  image: "/house.png",
};

const testimonialsContent = [
  {
    id: 1,
    name: "Ashokbhai Asalaliya",
    phone: "9979451573",
    rating: 5,
    image: "https://ui-avatars.com/api/?name=Ashokbhai+Asalaliya&background=2563EB&color=fff&size=128",
    testimonial:
      "I had a fantastic experience working with the team. They made the full buying process clear and stress-free.",
  },
  {
    id: 2,
    name: "Kalpesh Sheliya",
    phone: "9427670408",
    rating: 5,
    image: "https://ui-avatars.com/api/?name=Kalpesh+Sheliya&background=2563EB&color=fff&size=128",
    testimonial:
      "The advisors were responsive, transparent, and genuinely focused on finding the right property for my goals.",
  },
];

const reviewsData = [
  {
    name: "Kalpesh Sheliya",
    phone: "9427670408",
    rating: 5,
    testimonial:
      "I had an amazing experience with the team. They are cooperative and guided us clearly through every step.",
    image: "https://ui-avatars.com/api/?name=Kalpesh+Sheliya&background=2563EB&color=fff&size=128",
  },
  {
    name: "Mansukhb Pansuriy",
    phone: "9879825784",
    rating: 5,
    testimonial:
      "Outstanding service and strong professionalism throughout my property transaction journey.",
    image: "https://ui-avatars.com/api/?name=Mansukhb+Pansuriy&background=2563EB&color=fff&size=128",
  },
];

const projectData = [
  {
    title: "Vaikunth Homes",
    description:
      "A thoughtfully planned residential development designed for long-term value and comfortable family living.",
    status: "ONGOING",
    location: "Jahangirabad, Surat",
    address: "Near premium residential growth corridor",
    projectType: "Premium Development",
    developedBy: "Shree Jalaram Estate Agency",
    images: ["/house.png"],
    overview: {
      heading: "About Vaikunth Homes",
      highlight: "Premium opportunity in Jahangirabad, Surat with strong presentation and guided support.",
      projectArea: "Premium",
      configurations: "Custom inquiry",
      reraStatus: "Ongoing",
    },
    amenities: [
      "Attractive entrance",
      "Well-planned internal roads",
      "Street lights",
      "Clear-title guidance",
    ],
    locationDescription:
      "This location keeps the project connected to daily essentials while staying easy to understand for buyers and investors.",
    faqs: [
      {
        question: "Is this project suitable for end users and investors?",
        answer: "Yes. The presentation and location are positioned to support both family buyers and long-term investors.",
      },
      {
        question: "Can I request pricing and availability details?",
        answer: "Yes. Use the brochure or contact form to receive current details from the team.",
      },
    ],
    contactTitle: "Please share your contact",
    contactNote: "Limited time offers available",
    contactButtonLabel: "Get Offer",
  },
  {
    title: "Parivaar Bungalows",
    description:
      "A refined bungalow community for buyers who want better planning, stronger presentation, and a premium location.",
    status: "ONGOING",
    location: "Ugat Canal Road, Surat",
    address: "Close to daily essentials and connected roads",
    projectType: "Premium Bungalow Community",
    developedBy: "Shree Jalaram Estate Agency",
    images: ["/house.png"],
    overview: {
      heading: "About Parivaar Bungalows",
      highlight: "Refined bungalow living with location strength and family-focused planning.",
      projectArea: "Premium",
      configurations: "Custom inquiry",
      reraStatus: "Ongoing",
    },
    amenities: [
      "Secure entry planning",
      "Connected roads",
      "Premium neighborhood appeal",
      "Guided advisory support",
    ],
    locationDescription:
      "The project location stays well connected for daily movement while maintaining a premium residential identity.",
    faqs: [
      {
        question: "Can I schedule a site visit?",
        answer: "Yes. Share your contact details and our team will coordinate the next steps.",
      },
    ],
    contactTitle: "Please share your contact",
    contactNote: "Talk with our team for latest availability",
    contactButtonLabel: "Get Offer",
  },
];

const propertyData = [
  {
    title: "Premium 3BHK Apartment",
    description: "Modern 3BHK apartment with excellent connectivity and family-friendly amenities.",
    transactionType: "Buy",
    propertyType: "Residential",
    category: "Apartment",
    subCategory: "Apartment",
    location: "Adajan, Surat",
    address: "Near L.P Savani Circle",
    price: 7500000,
    sqt: 1650,
    bedrooms: 3,
    bathrooms: 3,
    images: ["/house.png"],
  },
  {
    title: "Main Road Commercial Shop",
    description: "Prime commercial shop location ideal for retail business and footfall growth.",
    transactionType: "Buy",
    propertyType: "Commercial",
    category: "Shop",
    subCategory: "Shop",
    location: "Vesu, Surat",
    address: "Near city business corridor",
    price: 9800000,
    sqt: 900,
    images: ["/house.png"],
  },
];

async function seed() {
  await connectDB();

  await Promise.all([
    Content.deleteMany({}),
    Project.deleteMany({}),
    Property.deleteMany({}),
    Review.deleteMany({}),
  ]);

  await Content.create([
    { key: "home.story", payload: homeStoryContent },
    { key: "about.story", payload: aboutStoryContent },
    { key: "testimonials.list", payload: testimonialsContent },
  ]);

  await Review.create(reviewsData);
  await Project.create(projectData);
  await Property.create(propertyData);

  // eslint-disable-next-line no-console
  console.log("Seed complete. Use POST /auth/register to create your admin account manually.");
  process.exit(0);
}

seed().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Seed failed", error);
  process.exit(1);
});
