import { Router } from "express";
import bcrypt from "bcryptjs";
import fs from "fs";
import os from "os";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import { User } from "../models/User.js";
import { Content } from "../models/Content.js";
import { Project } from "../models/Project.js";
import { Inquiry } from "../models/Inquiry.js";
import { env } from "../config/env.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";

export const adminPanelRouter = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultUploadsBase = path.resolve(__dirname, "../../uploads");
const tmpUploadsBase = path.join(os.tmpdir(), "uploads");

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch (error) {
    if (error && error.code === "EEXIST") {
      return true;
    }
    return false;
  }
}

const uploadsBase = process.env.VERCEL === "1" ? tmpUploadsBase : defaultUploadsBase;

if (process.env.VERCEL !== "1") {
  ensureDir(uploadsBase);
}

const homeUploadsDir = path.join(uploadsBase, "home");
const searchUploadsDir = path.join(uploadsBase, "search");
const aboutUploadsDir = path.join(uploadsBase, "about");
const aboutVideoUploadsDir = path.join(uploadsBase, "about/videos");
const projectUploadsDir = path.join(uploadsBase, "projects");
const projectBrochureUploadsDir = path.join(uploadsBase, "projects/brochures");
const projectVideoUploadsDir = path.join(uploadsBase, "projects/videos");

for (const dir of [
  homeUploadsDir,
  searchUploadsDir,
  aboutUploadsDir,
  aboutVideoUploadsDir,
  projectUploadsDir,
  projectBrochureUploadsDir,
  projectVideoUploadsDir,
]) {
  ensureDir(dir);
}

const homeImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, homeUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
      cb(null, `home-${Date.now()}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

const searchImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, searchUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
      cb(null, `search-${Date.now()}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 8 * 1024 * 1024 },
});

const aboutImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, aboutUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
      cb(null, `about-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 8 * 1024 * 1024 },
});

const aboutVideoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, aboutVideoUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeExt = ext || ".mp4";
      cb(null, `about-video-${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const isVideo = file.mimetype && file.mimetype.startsWith("video/");
    if (isVideo) {
      cb(null, true);
      return;
    }
    cb(new Error("Only video files are allowed for overview video"));
  },
  limits: { fileSize: 150 * 1024 * 1024 },
});

const projectAssetsUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, file, cb) => {
      if (file.fieldname === "brochureFile") {
        cb(null, projectBrochureUploadsDir);
        return;
      }

      if (file.fieldname === "videoFile") {
        cb(null, projectVideoUploadsDir);
        return;
      }

      cb(null, projectUploadsDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeExt = ext || (file.fieldname === "brochureFile" ? ".pdf" : (file.fieldname === "videoFile" ? ".mp4" : ".jpg"));
      cb(null, `project-${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === "projectImageFiles") {
      if (file.mimetype && file.mimetype.startsWith("image/")) {
        cb(null, true);
        return;
      }

      cb(new Error("Only image files are allowed for project images"));
      return;
    }

    if (file.fieldname === "brochureFile") {
      const isPdf = file.mimetype === "application/pdf";
      if (isPdf) {
        cb(null, true);
        return;
      }

      cb(new Error("Only PDF files are allowed for brochure upload"));
      return;
    }

    if (file.fieldname === "videoFile") {
      const isVideo = file.mimetype && file.mimetype.startsWith("video/");
      if (isVideo) {
        cb(null, true);
        return;
      }

      cb(new Error("Only video files are allowed for virtual tour upload"));
      return;
    }

    cb(new Error("Unsupported upload field"));
  },
  limits: {
    fileSize: 150 * 1024 * 1024,
    files: 12,
  },
});

adminPanelRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

function applyAuthCookies(res, accessToken, refreshToken) {
  const cookieBase = {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
  };

  res.cookie("accessToken", accessToken, {
    ...cookieBase,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieBase,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function authErrorUrl(path, message) {
  return `${path}?error=${encodeURIComponent(message)}`;
}

function renderLayout(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    :root {
      --bg: #f1f5f9;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #475569;
      --primary: #99bc3a;
      --primary-dark: #65bb04;
      --danger: #dc2626;
      --border: #e2e8f0;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: radial-gradient(circle at 15% 20%, #e2f0bf 0%, #f1f5f9 32%, #eef2f7 100%);
      color: var(--text);
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
    }
    .card {
      width: 100%;
      max-width: 980px;
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid var(--border);
      border-radius: 24px;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
      backdrop-filter: blur(5px);
      overflow: hidden;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.05fr 0.95fr;
      min-height: 560px;
    }
    .brand {
      background: linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #334155 100%);
      color: white;
      padding: 42px 36px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .brand h1 {
      margin: 0;
      font-size: 32px;
      line-height: 1.15;
    }
    .brand p {
      color: #cbd5e1;
      line-height: 1.7;
      margin-top: 16px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      background: rgba(153, 188, 58, 0.18);
      border: 1px solid rgba(153, 188, 58, 0.45);
      color: #def1ab;
      padding: 8px 12px;
      font-size: 12px;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      font-weight: 700;
      width: fit-content;
    }
    .panel {
      padding: 36px 34px;
      background: var(--card);
    }
    .panel h2 {
      margin: 0;
      font-size: 30px;
      line-height: 1.2;
    }
    .sub {
      margin: 10px 0 28px;
      color: var(--muted);
      line-height: 1.6;
    }
    label {
      display: block;
      font-size: 13px;
      margin-bottom: 7px;
      font-weight: 600;
      color: #334155;
    }
    input {
      width: 100%;
      border: 1px solid #cbd5e1;
      background: #fff;
      border-radius: 12px;
      padding: 12px 14px;
      font-size: 15px;
      margin-bottom: 14px;
      outline: none;
      transition: border-color .2s ease, box-shadow .2s ease;
    }
    input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(153, 188, 58, 0.2);
    }
    .btn {
      border: 0;
      border-radius: 12px;
      padding: 12px 18px;
      font-weight: 700;
      cursor: pointer;
      transition: transform .15s ease, box-shadow .2s ease, background .2s ease;
      width: 100%;
      font-size: 15px;
    }
    .btn.primary {
      background: var(--primary);
      color: #0f172a;
      box-shadow: 0 8px 20px rgba(153, 188, 58, 0.3);
    }
    .btn.primary:hover {
      background: var(--primary-dark);
      transform: translateY(-1px);
    }
    .btn.ghost {
      margin-top: 10px;
      background: white;
      border: 1px solid #cbd5e1;
      color: #0f172a;
    }
    .links {
      margin-top: 16px;
      font-size: 14px;
      color: #475569;
    }
    .links a {
      color: #1d4ed8;
      text-decoration: none;
      font-weight: 600;
    }
    .msg {
      margin: 0 0 16px;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 13px;
      font-weight: 600;
      display: none;
    }
    .msg.ok { display: block; background: #ecfccb; color: #365314; border: 1px solid #bef264; }
    .msg.err { display: block; background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .dashboard {
      padding: 34px;
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 22px;
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }
    .kpi {
      border: 1px solid var(--border);
      background: white;
      border-radius: 14px;
      padding: 14px;
    }
    .kpi h4 {
      margin: 0;
      color: #64748b;
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .kpi p {
      margin: 8px 0 0;
      font-size: 25px;
      font-weight: 800;
    }
    .table-wrap {
      margin-top: 16px;
      border: 1px solid var(--border);
      border-radius: 14px;
      overflow: hidden;
      background: white;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      text-align: left;
      padding: 12px 14px;
      border-bottom: 1px solid #e2e8f0;
    }
    th { background: #f8fafc; color: #334155; font-weight: 700; }
    tr:last-child td { border-bottom: 0; }
    @media (max-width: 900px) {
      .grid { grid-template-columns: 1fr; }
      .brand { min-height: 220px; }
      .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

function renderAuthPage(mode = "signin", errorMessage = "", options = {}) {
  const isSignin = mode === "signin";
  const title = isSignin ? "Admin Sign In" : "Admin Sign Up";
  const adminBaseUrl = normalizeBaseUrl(options.adminBaseUrl || "http://localhost:3000/admin");

  const formBody = isSignin
    ? `
      <label>Email</label>
      <input type="email" name="email" required placeholder="your.email@example.com" />
      <label>Password</label>
      <input type="password" name="password" required minlength="6" placeholder="Enter password" />
    `
    : `
      <label>Username</label>
      <input type="text" name="username" required minlength="1" placeholder="Enter username" />
      <label>Full Name</label>
      <input type="text" name="fullName" required minlength="2" placeholder="Enter your full name" />
      <label>Email</label>
      <input type="email" name="email" required placeholder="your.email@example.com" />
      <label>Mobile</label>
      <input type="tel" name="mobile" required minlength="10" placeholder="10-digit mobile number" />
      <label>Password</label>
      <input type="password" name="password" required minlength="6" placeholder="Minimum 6 characters" />
    `;

  const toggleLink = isSignin
    ? `New admin account? <a href="${adminBaseUrl}/signup">Create account</a>`
    : `Already have an account? <a href="${adminBaseUrl}/signin">Sign in</a>`;

  const buttonLabel = isSignin ? "Sign In" : "Create Account";

  const body = `
    <div class="card">
      <div class="grid">
        <div class="brand">
          <div>
            <span class="badge">Secure Admin Access</span>
            <h1>Shree Jalaram Estate<br/>Admin Panel</h1>
            <p>
              Manage content and operations from a protected backend panel.
              Use your admin account to access the dashboard and team data.
            </p>
          </div>
          <p style="margin-top:24px;font-size:13px;color:#94a3b8">
            Backend URL: <strong>${adminBaseUrl}</strong>
          </p>
        </div>

        <div class="panel">
          <h2>${title}</h2>
          <p class="sub">${isSignin ? "Sign in with your credentials to access the dashboard." : "Create a new admin account to get started."}</p>
          ${errorMessage ? `<div class="msg err" style="display:block">${errorMessage}</div>` : ""}
          <div id="msg" class="msg"></div>
          <form id="authForm" method="post" action="${isSignin ? `${adminBaseUrl}/signin` : `${adminBaseUrl}/signup`}">
            ${formBody}
            <button class="btn primary" type="submit">${buttonLabel}</button>
          </form>
          <p class="links">${toggleLink}</p>
        </div>
      </div>
    </div>
  `;

  return renderLayout(title, body);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseLines(value = "") {
  return String(value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFaqLines(value = "") {
  return parseLines(value)
    .map((line) => {
      const [question, ...answerParts] = line.split("||");
      const answer = answerParts.join("||").trim();

      if (!question?.trim() || !answer) {
        return null;
      }

      return {
        question: question.trim(),
        answer,
      };
    })
    .filter(Boolean);
}

function getBaseUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.get("host") || `localhost:${env.port || 3000}`;
  return `${protocol}://${host}`;
}

function normalizeBaseUrl(value = "") {
  return String(value).replace(/\/+$/, "");
}

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

function renderDashboard(user, options = {}) {
  const section = options.section || "dashboard";
  const aboutStory = options.aboutStory || null;
  const homeStory = options.homeStory || null;
  const seoSettings = options.seoSettings || defaultSeoSettings;
  const searchSettings = options.searchSettings || defaultSearchSettings;
  const inquirySettings = options.inquirySettings || defaultInquirySettings;
  const contactInfo = options.contactInfo || null;
  const projects = Array.isArray(options.projects) ? options.projects : [];
  const inquiries = Array.isArray(options.inquiries) ? options.inquiries : [];
  const homeSaved = Boolean(options.homeSaved);
  const aboutSaved = Boolean(options.aboutSaved);
  const projectSaved = Boolean(options.projectSaved);
  const seoSaved = Boolean(options.seoSaved);
  const searchSaved = Boolean(options.searchSaved);
  const inquirySaved = Boolean(options.inquirySaved);
  const contactSaved = Boolean(options.contactSaved);
  const frontendOrigin = normalizeBaseUrl(options.frontendOrigin || "http://localhost:5173");
  const adminBaseUrl = normalizeBaseUrl(options.adminBaseUrl || "http://localhost:3000/admin");
  const adminDashboardUrl = `${adminBaseUrl}/dashboard`;
  const adminHomeUrl = `${adminBaseUrl}/dashboard/home`;
  const adminAboutUrl = `${adminBaseUrl}/dashboard/about`;
  const adminProjectsUrl = `${adminBaseUrl}/dashboard/projects`;
  const adminInquiryUrl = `${adminBaseUrl}/dashboard/inquiry`;
  const adminSearchUrl = `${adminBaseUrl}/dashboard/search`;
  const adminSeoUrl = `${adminBaseUrl}/dashboard/seo`;
  const adminContactUrl = `${adminBaseUrl}/dashboard/contact`;
  const adminLogoutUrl = `${adminBaseUrl}/logout`;
  const refreshUrlBySection = {
    dashboard: adminDashboardUrl,
    home: adminHomeUrl,
    about: adminAboutUrl,
    projects: adminProjectsUrl,
    inquiry: adminInquiryUrl,
    search: adminSearchUrl,
    seo: adminSeoUrl,
    contact: adminContactUrl,
  };
  const adminRefreshUrl = refreshUrlBySection[section] || adminDashboardUrl;

  const isDashboard = section === "dashboard";
  const isHome = section === "home";
  const isAbout = section === "about";
  const isProjects = section === "projects";
  const isInquiry = section === "inquiry";
  const isSearch = section === "search";
  const isSeo = section === "seo";
  const isContact = section === "contact";

  const safeUser = {
    _id: escapeHtml(user?._id || ""),
    username: escapeHtml(user?.username || "-"),
    fullName: escapeHtml(user?.fullName || "-"),
    email: escapeHtml(user?.email || "-"),
    mobile: escapeHtml(user?.mobile || "-"),
    role: escapeHtml(user?.role || "-"),
  };

  const safeAbout = {
    kicker: escapeHtml(aboutStory?.kicker || "About The Story Behind Us"),
    title: escapeHtml(aboutStory?.title || "We shape spaces that stand for quality, trust, and long-term value."),
    intro: escapeHtml(aboutStory?.intro || "Shree Jalaram Estate Agency is a dynamic real estate organization committed to delivering thoughtfully designed developments."),
    details: escapeHtml(aboutStory?.details || "With over 14 years of industry experience, we focus on strong planning and lasting value."),
    stat1Value: escapeHtml(aboutStory?.stats?.[0]?.value || "100+"),
    stat1Label: escapeHtml(aboutStory?.stats?.[0]?.label || "Delivered Projects"),
    stat2Value: escapeHtml(aboutStory?.stats?.[1]?.value || "14+ Years"),
    stat2Label: escapeHtml(aboutStory?.stats?.[1]?.label || "of Industry Excellence"),
    stat3Value: escapeHtml(aboutStory?.stats?.[2]?.value || "25"),
    stat3Label: escapeHtml(aboutStory?.stats?.[2]?.label || "Award-winning Agents"),
    ctaLabel: escapeHtml(aboutStory?.ctaLabel || "Know More About Us"),
    ctaPath: escapeHtml(aboutStory?.ctaPath || "/aboutus"),
    heroImage: escapeHtml(aboutStory?.heroImage || "/house.png"),
    insetImage: escapeHtml(aboutStory?.insetImage || "/Logo.png"),
  };

  const safeSearch = {
    pageTitle: escapeHtml(searchSettings?.pageTitle || defaultSearchSettings.pageTitle),
    pageDescription: escapeHtml(searchSettings?.pageDescription || defaultSearchSettings.pageDescription),
    heroImage: escapeHtml(searchSettings?.heroImage || defaultSearchSettings.heroImage),
    transactionTypeOptions: escapeHtml(
      Array.isArray(searchSettings?.transactionTypeOptions)
        ? searchSettings.transactionTypeOptions.join("\n")
        : defaultSearchSettings.transactionTypeOptions.join("\n")
    ),
    propertyTypeOptions: escapeHtml(
      Array.isArray(searchSettings?.propertyTypeOptions)
        ? searchSettings.propertyTypeOptions.join("\n")
        : defaultSearchSettings.propertyTypeOptions.join("\n")
    ),
    categoryResidential: escapeHtml(
      Array.isArray(searchSettings?.categoryResidential)
        ? searchSettings.categoryResidential.join("\n")
        : defaultSearchSettings.categoryResidential.join("\n")
    ),
    categoryCommercial: escapeHtml(
      Array.isArray(searchSettings?.categoryCommercial)
        ? searchSettings.categoryCommercial.join("\n")
        : defaultSearchSettings.categoryCommercial.join("\n")
    ),
    showPropertySubtype: searchSettings?.showPropertySubtype ? "checked" : "",
    showBathrooms: searchSettings?.showBathrooms ? "checked" : "",
    propertySubtypeResidential: escapeHtml(
      Array.isArray(searchSettings?.propertySubtypeResidential)
        ? searchSettings.propertySubtypeResidential.join("\n")
        : defaultSearchSettings.propertySubtypeResidential.join("\n")
    ),
    propertySubtypeCommercial: escapeHtml(
      Array.isArray(searchSettings?.propertySubtypeCommercial)
        ? searchSettings.propertySubtypeCommercial.join("\n")
        : defaultSearchSettings.propertySubtypeCommercial.join("\n")
    ),
    bhkOptions: escapeHtml(
      Array.isArray(searchSettings?.bhkOptions)
        ? searchSettings.bhkOptions.join("\n")
        : defaultSearchSettings.bhkOptions.join("\n")
    ),
    bathroomOptions: escapeHtml(
      Array.isArray(searchSettings?.bathroomOptions)
        ? searchSettings.bathroomOptions.join("\n")
        : defaultSearchSettings.bathroomOptions.join("\n")
    ),
  };

  const safeInquiry = {
    developedByLabel: escapeHtml(inquirySettings?.developedByLabel || defaultInquirySettings.developedByLabel),
    developedByDefault: escapeHtml(inquirySettings?.developedByDefault || defaultInquirySettings.developedByDefault),
    cardTitle: escapeHtml(inquirySettings?.cardTitle || defaultInquirySettings.cardTitle),
    buttonLabel: escapeHtml(inquirySettings?.buttonLabel || defaultInquirySettings.buttonLabel),
    note: escapeHtml(inquirySettings?.note || defaultInquirySettings.note),
  };

  const projectFormDefaults = {
    developedBy: "Shree Jalaram Estate Agency",
    projectType: "Premium Development",
    overviewHeading: "About Project",
    overviewHighlight: "Premium opportunity with guided support.",
    projectArea: "Premium",
    configurations: "Custom inquiry",
    reraStatus: "Ongoing",
    locationDescription: "This section keeps the location details easy to scan for users before they contact your team.",
    virtualTourTitle: "Virtual tour can be added here",
    virtualTourDescription: "Add a YouTube or other embed link when your walkthrough is ready.",
    contactTitle: "Please share your contact",
    contactNote: "Limited time offers available",
    contactButtonLabel: "Get Offer",
    amenities: "Attractive entrance\nWell-planned internal roads\nStreet lights\nClear-title guidance",
    faqs: "Is this project suitable for end users and investors?||Yes. The project is presented for both family buyers and long-term investors.\nCan I request pricing and availability details?||Yes. Use the contact form and our team can share the latest details with you.",
  };

  const seoPages = [
    ["home", "Home Page", "/"],
    ["projects", "Projects Page", "/projects"],
    ["aboutus", "About Us Page", "/aboutus"],
    ["contactus", "Contact Page", "/contactus"],
    ["search", "Search Page", "/search"],
    ["residential", "Residential Page", "/residential"],
    ["commercial", "Commercial Page", "/commercial"],
    ["reviews", "Reviews Page", "/reviews"],
  ];

  const mainPanel = isHome
    ? `
      <section class="dash-panel">
        <h4>Home Section</h4>
        <p class="note">Manage live home page content from backend storage key <code>home.story</code>.</p>
        ${homeSaved ? `<p class="note" style="margin-top:10px;color:#166534;font-weight:700">Home section saved successfully.</p>` : ""}
        <ul class="dash-list">
          <li><span>Public Home URL</span><code>${escapeHtml(frontendOrigin)}/</code></li>
          <li><span>Projects Page</span><code>${escapeHtml(frontendOrigin)}/projects</code></li>
          <li><span>Search Page</span><code>${escapeHtml(frontendOrigin)}/search</code></li>
          <li><span>Backend Health</span><code>/health</code></li>
        </ul>
      </section>

      <section class="dash-panel">
        <h4>Home Content Editor</h4>
        <p class="note">Update home text content and save changes instantly.</p>
        <form method="post" enctype="multipart/form-data" action="${adminHomeUrl}/upload-image" style="margin-top:12px">
          <label for="homeImage">Home Hero Image</label>
          <input id="homeImage" name="homeImage" type="file" accept="image/*" required />
          <div class="dash-actions" style="margin-top:12px;gap:8px;flex-wrap:wrap">
            <button class="dash-btn secondary" type="submit">Upload Image</button>
            ${homeStory?.image ? `<a class="dash-btn secondary" href="${escapeHtml(homeStory.image)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">View Current Image</a>` : ""}
          </div>
        </form>

        <form method="post" action="${adminHomeUrl}/save" style="margin-top:12px">
          <label for="homeKicker">Kicker</label>
          <input id="homeKicker" name="kicker" type="text" value="${escapeHtml(homeStory?.kicker || "Premium Real Estate Solutions")}" required />

          <label for="homeTitle">Main Title</label>
          <input id="homeTitle" name="title" type="text" value="${escapeHtml(homeStory?.title || "Your Dream Property Awaits Here")}" required />

          <label for="homeDescription">Description</label>
          <input id="homeDescription" name="description" type="text" value="${escapeHtml(homeStory?.description || "Discover curated properties in Surat's prime locations.")}" required />

          <label for="homePrimaryLabel">Primary Button Label</label>
          <input id="homePrimaryLabel" name="primaryLabel" type="text" value="${escapeHtml(homeStory?.primaryLabel || "Explore Properties")}" required />

          <label for="homePrimaryPath">Primary Button Path</label>
          <input id="homePrimaryPath" name="primaryPath" type="text" value="${escapeHtml(homeStory?.primaryPath || "/search")}" required />

          <label for="homeSecondaryLabel">Secondary Button Label</label>
          <input id="homeSecondaryLabel" name="secondaryLabel" type="text" value="${escapeHtml(homeStory?.secondaryLabel || "Talk to Advisor")}" required />

          <label for="homeSecondaryPath">Secondary Button Path</label>
          <input id="homeSecondaryPath" name="secondaryPath" type="text" value="${escapeHtml(homeStory?.secondaryPath || "/contactus")}" required />

          <div class="dash-actions" style="margin-top:12px;gap:8px;flex-wrap:wrap">
            <button class="dash-btn primary" type="submit">Save Home Section</button>
            <a class="dash-btn secondary" href="${escapeHtml(frontendOrigin)}/" target="_blank" rel="noopener noreferrer" style="text-decoration:none">Open Home</a>
          </div>
        </form>
      </section>
    `
    : isAbout
      ? `
      <section class="dash-panel">
        <h4>About Us Section</h4>
        <p class="note">Manage <code>about.story</code> with two images and live preview.</p>
        ${aboutSaved ? `<p class="note" style="margin-top:10px;color:#166534;font-weight:700">About section saved successfully.</p>` : ""}
      </section>
      <section class="dash-panel">
        <h4>About Editor</h4>
        <p class="note">Upload two images and update content fields instantly.</p>

        <form method="post" enctype="multipart/form-data" action="${adminAboutUrl}/upload-images" style="margin-top:12px">
          <label for="aboutHeroImage">Hero Image</label>
          <input id="aboutHeroImage" name="heroImage" type="file" accept="image/*" />
          <label for="aboutInsetImage">Inset / Logo Image</label>
          <input id="aboutInsetImage" name="insetImage" type="file" accept="image/*" />
          <div class="dash-actions" style="margin-top:12px;gap:8px;flex-wrap:wrap">
            <button class="dash-btn secondary" type="submit">Upload 2 Images</button>
            <a class="dash-btn secondary" href="${safeAbout.heroImage}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">View Hero</a>
            <a class="dash-btn secondary" href="${safeAbout.insetImage}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">View Inset</a>
          </div>
        </form>

        <form method="post" enctype="multipart/form-data" action="${adminAboutUrl}/upload-video" style="margin-top:12px">
          <label for="aboutOverviewVideo">Upload Overview Video (optional)</label>
          <p class="note" style="margin-top:2px;margin-bottom:10px">Video shown on About Us page with play button overlay.</p>
          <input id="aboutOverviewVideo" name="overviewVideo" type="file" accept="video/*" />
          <div class="dash-actions" style="margin-top:12px;gap:8px;flex-wrap:wrap">
            <button class="dash-btn secondary" type="submit">Upload Video</button>
          </div>
        </form>

        <form method="post" action="${adminAboutUrl}/save" style="margin-top:12px">
          <label for="aboutKicker">Kicker</label>
          <input id="aboutKicker" name="kicker" type="text" value="${safeAbout.kicker}" required />

          <label for="aboutTitle">Title</label>
          <input id="aboutTitle" name="title" type="text" value="${safeAbout.title}" required />

          <label for="aboutIntro">Intro</label>
          <input id="aboutIntro" name="intro" type="text" value="${safeAbout.intro}" required />

          <label for="aboutDetails">Details</label>
          <input id="aboutDetails" name="details" type="text" value="${safeAbout.details}" required />

          <label for="stat1Value">Stat 1 Value</label>
          <input id="stat1Value" name="stat1Value" type="text" value="${safeAbout.stat1Value}" required />
          <label for="stat1Label">Stat 1 Label</label>
          <input id="stat1Label" name="stat1Label" type="text" value="${safeAbout.stat1Label}" required />

          <label for="stat2Value">Stat 2 Value</label>
          <input id="stat2Value" name="stat2Value" type="text" value="${safeAbout.stat2Value}" required />
          <label for="stat2Label">Stat 2 Label</label>
          <input id="stat2Label" name="stat2Label" type="text" value="${safeAbout.stat2Label}" required />

          <label for="stat3Value">Stat 3 Value</label>
          <input id="stat3Value" name="stat3Value" type="text" value="${safeAbout.stat3Value}" required />
          <label for="stat3Label">Stat 3 Label</label>
          <input id="stat3Label" name="stat3Label" type="text" value="${safeAbout.stat3Label}" required />

          <label for="aboutCtaLabel">CTA Label</label>
          <input id="aboutCtaLabel" name="ctaLabel" type="text" value="${safeAbout.ctaLabel}" required />
          <label for="aboutCtaPath">CTA Path</label>
          <input id="aboutCtaPath" name="ctaPath" type="text" value="${safeAbout.ctaPath}" required />

          <div style="border:1px solid #dbe4f2;border-radius:14px;background:#f8fbff;padding:14px;margin-bottom:14px;margin-top:12px">
            <p style="margin:0;color:#64748b;font-size:13px;font-weight:600">Overview Video Preview</p>
            <p style="margin:6px 0;color:#64748b;font-size:12px">COMPANY INTRODUCTION</p>
            <div id="aboutVideoPreview" style="margin:8px 0;position:relative;width:100%;padding-bottom:56.25%;background:#000;border-radius:8px;overflow:hidden">
              <video id="aboutVideoPlayer" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:none" controls></video>
              <div id="aboutVideoPlaceholder" style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#222;color:#999;font-size:14px">No video selected</div>
            </div>
          </div>

          <div class="dash-actions" style="margin-top:12px;gap:8px;flex-wrap:wrap">
            <button class="dash-btn primary" type="submit">Save About Section</button>
            <a class="dash-btn secondary" href="${escapeHtml(frontendOrigin)}/aboutus" target="_blank" rel="noopener noreferrer" style="text-decoration:none">Open About Page</a>
          </div>
        </form>
      </section>
    `
      : isProjects
        ? `
      <section class="dash-panel">
        <h4>Projects Section</h4>
        <p class="note">Add and manage project cards from backend.</p>
        ${projectSaved ? `<p class="note" style="margin-top:10px;color:#166534;font-weight:700">Project saved successfully.</p>` : ""}

        <form method="post" enctype="multipart/form-data" action="${adminProjectsUrl}/add" style="margin-top:12px">
          <label for="projectTitle">Project Title</label>
          <input id="projectTitle" name="title" type="text" required placeholder="Vaikunth Homes" />

          <label for="projectStatus">Status</label>
          <select id="projectStatus" name="status" style="width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px">
            <option value="ONGOING">ONGOING</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>

          <label for="projectLocation">Location</label>
          <input id="projectLocation" name="location" type="text" required placeholder="Jahangirabad, Surat" />

          <label for="projectAddress">Address</label>
          <input id="projectAddress" name="address" type="text" required placeholder="Near premium residential growth corridor" />

          <label for="projectDescription">Description</label>
          <textarea id="projectDescription" name="description" rows="4" required style="width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px;resize:vertical" placeholder="Project description"></textarea>

          <label for="projectType">Project Type</label>
          <input id="projectType" name="projectType" type="text" required value="${escapeHtml(projectFormDefaults.projectType)}" />

          <label for="developedBy">Developed By</label>
          <input id="developedBy" name="developedBy" type="text" required value="${escapeHtml(projectFormDefaults.developedBy)}" />

          <p class="note" style="margin-top:2px;margin-bottom:10px">The fields below control the right-side contact card on the frontend Project Details page.</p>

          <div style="border:1px solid #dbe4f2;border-radius:14px;background:#f8fbff;padding:14px;margin-bottom:14px">
            <p style="margin:0;color:#64748b;font-size:13px">Preview Card</p>
            <p style="margin:8px 0 0;font-size:13px;color:#64748b">Developed by</p>
            <p id="contactPreviewDevelopedBy" style="margin:4px 0 0;font-size:26px;font-weight:800;color:#0f172a;line-height:1.2">${escapeHtml(projectFormDefaults.developedBy)}</p>
            <div style="height:1px;background:#dbe4f2;margin:12px 0"></div>
            <p id="contactPreviewTitle" style="margin:0;font-size:20px;font-weight:800;color:#0f172a;line-height:1.2">${escapeHtml(projectFormDefaults.contactTitle)}</p>
            <input type="text" value="Name" readonly style="margin-top:12px;width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:10px 12px;background:#fff;color:#64748b" />
            <input type="text" value="Mobile Number" readonly style="margin-top:8px;width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:10px 12px;background:#fff;color:#64748b" />
            <button id="contactPreviewButton" type="button" style="margin-top:10px;width:100%;border:0;border-radius:12px;padding:11px 12px;font-weight:700;background:#2563eb;color:#fff">${escapeHtml(projectFormDefaults.contactButtonLabel)}</button>
            <p id="contactPreviewNote" style="margin:10px 0 0;text-align:center;color:#64748b;font-size:13px">${escapeHtml(projectFormDefaults.contactNote)}</p>
          </div>

          <div style="border:1px dashed #99bc3a;background:#f7fbe9;border-radius:12px;padding:12px;margin-bottom:14px">
            <p style="margin:0 0 8px;font-weight:700;color:#365314">OR Upload Files From Computer</p>
            <label for="projectImageFiles">Upload Project Images (optional)</label>
            <input id="projectImageFiles" name="projectImageFiles" type="file" accept="image/*" multiple />
          </div>

          <div style="border:1px solid #e2e8f0;background:#f8fbff;border-radius:14px;padding:14px;margin-bottom:14px">
            <p style="margin:0;color:#64748b;font-size:13px;font-weight:600">Image Preview Gallery</p>
            <div id="imagePreviewContainer" style="margin-top:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
              <p style="grid-column:1/-1;color:#64748b;font-size:13px;margin:0">Select images above to see preview. These will appear as a carousel on the project details page.</p>
            </div>
          </div>

          <label for="projectBrochureFile">Upload Brochure PDF (optional)</label>
          <input id="projectBrochureFile" name="brochureFile" type="file" accept="application/pdf" />

          <label for="overviewHeading">Overview Heading</label>
          <input id="overviewHeading" name="overviewHeading" type="text" required value="${escapeHtml(projectFormDefaults.overviewHeading)}" />

          <label for="overviewHighlight">Overview Highlight</label>
          <textarea id="overviewHighlight" name="overviewHighlight" rows="2" required style="width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px;resize:vertical">${escapeHtml(projectFormDefaults.overviewHighlight)}</textarea>

          <label for="projectArea">Project Area</label>
          <input id="projectArea" name="projectArea" type="text" required value="${escapeHtml(projectFormDefaults.projectArea)}" />

          <label for="configurations">Configurations</label>
          <input id="configurations" name="configurations" type="text" required value="${escapeHtml(projectFormDefaults.configurations)}" />

          <label for="reraStatus">RERA / Status</label>
          <input id="reraStatus" name="reraStatus" type="text" required value="${escapeHtml(projectFormDefaults.reraStatus)}" />

          <label for="amenities">Amenities (one per line)</label>
          <textarea id="amenities" name="amenities" rows="5" style="width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px;resize:vertical" placeholder="Attractive entrance&#10;Street lights">${escapeHtml(projectFormDefaults.amenities)}</textarea>

          <label for="locationDescription">Location Description</label>
          <textarea id="locationDescription" name="locationDescription" rows="3" style="width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px;resize:vertical">${escapeHtml(projectFormDefaults.locationDescription)}</textarea>

          <label for="virtualTourFile">Upload Virtual Tour Video (optional)</label>
          <input id="virtualTourFile" name="videoFile" type="file" accept="video/*" />

          <label for="virtualTourTitle">Virtual Tour Title</label>
          <input id="virtualTourTitle" name="virtualTourTitle" type="text" required value="${escapeHtml(projectFormDefaults.virtualTourTitle)}" />

          <label for="virtualTourDescription">Virtual Tour Description</label>
          <textarea id="virtualTourDescription" name="virtualTourDescription" rows="3" style="width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px;resize:vertical">${escapeHtml(projectFormDefaults.virtualTourDescription)}</textarea>

          <label for="faqs">FAQs (one per line, format: Question || Answer)</label>
          <textarea id="faqs" name="faqs" rows="5" style="width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px;resize:vertical">${escapeHtml(projectFormDefaults.faqs)}</textarea>

          <label for="contactTitle">Contact Card Title</label>
          <input id="contactTitle" name="contactTitle" type="text" required value="${escapeHtml(projectFormDefaults.contactTitle)}" />

          <label for="contactButtonLabel">Contact Button Label</label>
          <input id="contactButtonLabel" name="contactButtonLabel" type="text" required value="${escapeHtml(projectFormDefaults.contactButtonLabel)}" />

          <label for="contactNote">Contact Card Note</label>
          <input id="contactNote" name="contactNote" type="text" required value="${escapeHtml(projectFormDefaults.contactNote)}" />

          <div class="dash-actions" style="margin-top:12px;gap:8px;flex-wrap:wrap">
            <button class="dash-btn primary" type="submit">Add Project</button>
            <a class="dash-btn secondary" href="${escapeHtml(frontendOrigin)}/projects" target="_blank" rel="noopener noreferrer" style="text-decoration:none">Open Projects</a>
          </div>
        </form>
      </section>

      <section class="dash-panel">
        <h4>Existing Projects (${projects.length})</h4>
        <ul class="dash-list" style="margin-top:12px">
          ${
            projects.length
              ? projects.map((item) => `
                <li style="display:block">
                  <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
                    <div>
                      <strong>${escapeHtml(item.title || "-")}</strong>
                      <div style="font-size:12px;color:#64748b;margin-top:2px">${escapeHtml(item.location || "-")} • ${escapeHtml(item.status || "-")}</div>
                    </div>
                    <form method="post" action="${adminProjectsUrl}/delete/${escapeHtml(item._id)}" style="margin:0">
                      <button class="dash-btn secondary" type="submit" style="padding:8px 12px">Delete</button>
                    </form>
                  </div>
                </li>
              `).join("")
              : `<li><span>No projects yet. Add your first project above.</span></li>`
          }
        </ul>
      </section>
    `
      : isInquiry
        ? `
      <section class="dash-panel">
        <h4>Inquiry Section</h4>
        <p class="note">Manage default labels and texts for the project inquiry card shown on Project Details pages.</p>
        ${inquirySaved ? `<p class="note" style="margin-top:10px;color:#166534;font-weight:700">Inquiry settings saved successfully.</p>` : ""}
        <ul class="dash-list">
          <li><span>Public Page</span><code>${escapeHtml(frontendOrigin)}/project/*</code></li>
          <li><span>Backend Route</span><code>/api/content/inquiry</code></li>
          <li><span>User Inquiry API</span><code>/api/inquiries</code></li>
        </ul>
      </section>

      <section class="dash-panel">
        <h4>Inquiry Card Editor</h4>
        <p class="note">These values are used as defaults when specific project-level values are not provided.</p>
        <form method="post" action="${adminInquiryUrl}/save" style="margin-top:12px">
          <label for="inquiryDevelopedByLabel">Developed By Label</label>
          <input id="inquiryDevelopedByLabel" name="developedByLabel" type="text" value="${safeInquiry.developedByLabel}" required />

          <label for="inquiryDevelopedByDefault">Default Developed By</label>
          <input id="inquiryDevelopedByDefault" name="developedByDefault" type="text" value="${safeInquiry.developedByDefault}" required />

          <label for="inquiryCardTitle">Card Title</label>
          <input id="inquiryCardTitle" name="cardTitle" type="text" value="${safeInquiry.cardTitle}" required />

          <label for="inquiryButtonLabel">Button Label</label>
          <input id="inquiryButtonLabel" name="buttonLabel" type="text" value="${safeInquiry.buttonLabel}" required />

          <label for="inquiryNote">Note</label>
          <input id="inquiryNote" name="note" type="text" value="${safeInquiry.note}" required />

          <div class="dash-actions" style="margin-top:12px;gap:8px;flex-wrap:wrap">
            <button class="dash-btn primary" type="submit">Save Inquiry Settings</button>
            <a class="dash-btn secondary" href="${escapeHtml(frontendOrigin)}/projects" target="_blank" rel="noopener noreferrer" style="text-decoration:none">Open Projects</a>
          </div>
        </form>
      </section>

      <section class="dash-panel">
        <h4>User Inquiries (${inquiries.length})</h4>
        <p class="note">Latest contact and project inquiries submitted by users.</p>
        <ul class="dash-list" style="margin-top:12px">
          ${
            inquiries.length
              ? inquiries.map((item) => {
                  const type = escapeHtml(item?.type || "-");
                  const name = escapeHtml(item?.name || "-");
                  const mobile = escapeHtml(item?.mobile || "-");
                  const projectName = escapeHtml(item?.projectId?.title || "-");
                  const message = escapeHtml(item?.message || "-");
                  const createdAt = escapeHtml(
                    item?.createdAt
                      ? new Date(item.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      : "-"
                  );

                  return `
                    <li style="display:block">
                      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
                        <div>
                          <strong>${name}</strong>
                          <div style="font-size:12px;color:#64748b;margin-top:2px">${mobile} • ${type} • ${createdAt}</div>
                          <div style="font-size:12px;color:#0f172a;margin-top:6px">Project: ${projectName}</div>
                          <div style="font-size:12px;color:#334155;margin-top:4px">Message: ${message}</div>
                        </div>
                        <form method="post" action="${adminInquiryUrl}/delete/${escapeHtml(item?._id || "")}" style="margin:0">
                          <button class="dash-btn secondary" type="submit" style="padding:8px 12px">Delete</button>
                        </form>
                      </div>
                    </li>
                  `;
                }).join("")
              : `<li><span>No user inquiries yet.</span></li>`
          }
        </ul>
      </section>
    `
      : isSearch
        ? `
      <section class="dash-panel">
        <h4>Search Settings</h4>
        <p class="note">Manage the public search page copy and optional filter sections from backend storage key <code>search.settings</code>.</p>
        ${searchSaved ? `<p class="note" style="margin-top:10px;color:#166534;font-weight:700">Search settings saved successfully.</p>` : ""}
        <ul class="dash-list">
          <li><span>Public Search URL</span><code>${escapeHtml(frontendOrigin)}/search</code></li>
          <li><span>Backend Route</span><code>/api/content/search</code></li>
          <li><span>Property Subtype</span><code>${searchSettings?.showPropertySubtype ? "Enabled" : "Disabled"}</code></li>
          <li><span>Bathrooms Filter</span><code>${searchSettings?.showBathrooms ? "Enabled" : "Disabled"}</code></li>
        </ul>
      </section>

      <section class="dash-panel">
        <h4>Search Page Editor</h4>
        <p class="note">Update the search hero copy and optional filter lists. Leaving the toggles off keeps the public page compact.</p>
        <form method="post" enctype="multipart/form-data" action="${adminSearchUrl}/upload-image" style="margin-top:12px">
          <label for="searchHeroImage">Search Hero Image</label>
          <input id="searchHeroImage" name="searchHeroImage" type="file" accept="image/*" required />
          <div class="dash-actions" style="margin-top:12px;gap:8px;flex-wrap:wrap">
            <button class="dash-btn secondary" type="submit">Upload Image</button>
            ${safeSearch.heroImage ? `<a class="dash-btn secondary" href="${safeSearch.heroImage}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">View Current Image</a>` : ""}
          </div>
        </form>

        <form method="post" action="${adminSearchUrl}/save" style="margin-top:12px">
          <label for="searchPageTitle">Page Title</label>
          <input id="searchPageTitle" name="pageTitle" type="text" value="${safeSearch.pageTitle}" required />

          <label for="searchPageDescription">Page Description</label>
          <textarea id="searchPageDescription" name="pageDescription" rows="3" required style="width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px;resize:vertical;font-size:15px">${safeSearch.pageDescription}</textarea>

          <label for="searchTransactionTypes">Transaction Types (one per line)</label>
          <textarea id="searchTransactionTypes" name="transactionTypeOptions" rows="3" style="width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px;resize:vertical">${safeSearch.transactionTypeOptions}</textarea>

          <label for="searchPropertyTypes">Property Types (one per line)</label>
          <textarea id="searchPropertyTypes" name="propertyTypeOptions" rows="3" style="width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px;resize:vertical">${safeSearch.propertyTypeOptions}</textarea>

          <label for="searchCategoryResidential">Category - Residential (one per line)</label>
          <textarea id="searchCategoryResidential" name="categoryResidential" rows="5" style="width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px;resize:vertical">${safeSearch.categoryResidential}</textarea>

          <label for="searchCategoryCommercial">Category - Commercial (one per line)</label>
          <textarea id="searchCategoryCommercial" name="categoryCommercial" rows="5" style="width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px;resize:vertical">${safeSearch.categoryCommercial}</textarea>

          <label style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <input type="checkbox" name="showPropertySubtype" ${safeSearch.showPropertySubtype} />
            <span>Show Property Subtype section on the public search page</span>
          </label>

          <label style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <input type="checkbox" name="showBathrooms" ${safeSearch.showBathrooms} />
            <span>Show Bathrooms filter on the public search page</span>
          </label>

          <label for="searchSubtypeResidential">Property Subtype - Residential (one per line)</label>
          <textarea id="searchSubtypeResidential" name="propertySubtypeResidential" rows="5" style="width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px;resize:vertical">${safeSearch.propertySubtypeResidential}</textarea>

          <label for="searchSubtypeCommercial">Property Subtype - Commercial (one per line)</label>
          <textarea id="searchSubtypeCommercial" name="propertySubtypeCommercial" rows="5" style="width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px;resize:vertical">${safeSearch.propertySubtypeCommercial}</textarea>

          <label for="searchBhkOptions">BHK Options (one per line)</label>
          <textarea id="searchBhkOptions" name="bhkOptions" rows="5" style="width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:14px;resize:vertical">${safeSearch.bhkOptions}</textarea>

          <div class="dash-actions" style="margin-top:12px;gap:8px;flex-wrap:wrap">
            <button class="dash-btn primary" type="submit">Save Search Settings</button>
            <a class="dash-btn secondary" href="${escapeHtml(frontendOrigin)}/search" target="_blank" rel="noopener noreferrer" style="text-decoration:none">Open Search Page</a>
          </div>
        </form>
      </section>
    `
      : isSeo
        ? `
      <section class="dash-panel">
        <h4>SEO Metadata Manager</h4>
        <p class="note">Manage title tags and meta descriptions for every main public page from backend storage key <code>seo.settings</code>.</p>
        ${seoSaved ? `<p class="note" style="margin-top:10px;color:#166534;font-weight:700">SEO metadata saved successfully.</p>` : ""}
        <ul class="dash-list">
          ${seoPages.map(([key, label, pagePath]) => `<li><span>${label}</span><code>${escapeHtml(frontendOrigin)}${pagePath}</code></li>`).join("")}
        </ul>
      </section>

      <section class="dash-panel">
        <h4>SEO Editor</h4>
        <p class="note">Use strong, unique titles and meta descriptions for all major public sections.</p>
        <form method="post" action="${adminSeoUrl}/save" style="margin-top:12px">
          ${seoPages.map(([key, label]) => `
            <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-bottom:14px;background:#f8fbff">
              <h5 style="margin:0 0 12px;font-size:16px;color:#0f172a">${label}</h5>
              <label for="seo_${key}_title">${label} Title</label>
              <input id="seo_${key}_title" name="${key}_title" type="text" value="${escapeHtml(seoSettings?.[key]?.title || defaultSeoSettings[key].title)}" required />
              <label for="seo_${key}_description">${label} Description</label>
              <textarea id="seo_${key}_description" name="${key}_description" rows="3" required style="width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin-bottom:4px;resize:vertical;font-size:15px">${escapeHtml(seoSettings?.[key]?.description || defaultSeoSettings[key].description)}</textarea>
            </div>
          `).join("")}
          <div class="dash-actions" style="margin-top:12px;gap:8px;flex-wrap:wrap">
            <button class="dash-btn primary" type="submit">Save SEO Metadata</button>
            <a class="dash-btn secondary" href="${escapeHtml(frontendOrigin)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none">Open Website</a>
          </div>
        </form>
      </section>
    `
      : isContact
        ? `
      <section class="dash-panel">
        <h4>Contact Information</h4>
        <p class="note">User contact details submitted from the Contact Us form.</p>
      </section>

      <section class="dash-panel">
        <h4>User Contact Details (${inquiries.length})</h4>
        <p class="note">Latest contact form submissions from website users.</p>
        <ul class="dash-list" style="margin-top:12px">
          ${
            inquiries.length
              ? inquiries.map((item) => {
                  const name = escapeHtml(item?.name || "-");
                  const mobile = escapeHtml(item?.mobile || "-");
                  const email = escapeHtml(item?.email || "-");
                  const message = escapeHtml(item?.message || "-");
                  const createdAt = escapeHtml(
                    item?.createdAt
                      ? new Date(item.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      : "-"
                  );

                  return `
                    <li style="display:block">
                      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
                        <div>
                          <strong>${name}</strong>
                          <div style="font-size:12px;color:#64748b;margin-top:2px">${mobile} • ${email} • ${createdAt}</div>
                          <div style="font-size:12px;color:#334155;margin-top:4px">Message: ${message}</div>
                        </div>
                        <form method="post" action="${adminContactUrl}/delete/${escapeHtml(item?._id || "")}" style="margin:0">
                          <button class="dash-btn secondary" type="submit" style="padding:8px 12px">Delete</button>
                        </form>
                      </div>
                    </li>
                  `;
                }).join("")
              : `<li><span>No user contact details submitted yet.</span></li>`
          }
        </ul>
      </section>
    `
      : `
      <section class="dash-grid">
        <article class="dash-card">
          <h5>Profile Status</h5>
          <p>Active</p>
          <small>Authenticated and connected</small>
        </article>
        <article class="dash-card">
          <h5>Account Role</h5>
          <p>${safeUser.role}</p>
          <small>Access level is valid</small>
        </article>
        <article class="dash-card">
          <h5>Content Modules</h5>
          <p>4</p>
          <small>Projects, Properties, Reviews, About</small>
        </article>
        <article class="dash-card">
          <h5>User Id</h5>
          <p style="font-size:18px;word-break:break-all">${safeUser._id}</p>
          <small>Secure identifier</small>
        </article>
      </section>

      <section class="dash-lower">
        <div class="dash-panel">
          <h4>Section Navigation</h4>
          <p class="note">Use these sections to manage and review your website content.</p>
          <ul class="dash-list">
            <li><span>Dashboard</span><code>/admin/dashboard</code></li>
            <li><span>Home</span><code>/admin/dashboard/home</code></li>
            <li><span>About Us</span><code>/admin/dashboard/about</code></li>
            <li><span>Inquiry</span><code>/admin/dashboard/inquiry</code></li>
            <li><span>Search</span><code>/admin/dashboard/search</code></li>
            <li><span>SEO</span><code>/admin/dashboard/seo</code></li>
            <li><span>Signin</span><code>/admin/signin</code></li>
          </ul>
        </div>

        <div class="dash-panel">
          <h4>Account Details</h4>
          <p class="note">Signed in session details for current admin.</p>
          <ul class="dash-list">
            <li><span>Username</span><strong>${safeUser.username}</strong></li>
            <li><span>Full Name</span><strong>${safeUser.fullName}</strong></li>
            <li><span>Email</span><strong>${safeUser.email}</strong></li>
            <li><span>Mobile</span><strong>${safeUser.mobile}</strong></li>
          </ul>
        </div>
      </section>
    `;

  const body = `
    <style>
      .dash-shell {
        width: 100%;
        max-width: 1220px;
        min-height: 690px;
        display: grid;
        grid-template-columns: 250px 1fr;
        border-radius: 22px;
        overflow: hidden;
        background: #ffffff;
        box-shadow: 0 22px 65px rgba(15, 23, 42, 0.16);
      }
      .dash-sidebar {
        background: linear-gradient(170deg, #11203c 0%, #1e345b 52%, #214273 100%);
        color: #dbe7ff;
        padding: 28px 18px;
      }
      .dash-logo {
        font-size: 24px;
        font-weight: 800;
        color: #ffffff;
        margin: 0 0 22px;
      }
      .dash-profile {
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 14px;
        margin-bottom: 22px;
      }
      .dash-profile h4 {
        margin: 0;
        color: #ffffff;
        font-size: 16px;
      }
      .dash-profile p {
        margin: 6px 0 0;
        font-size: 12px;
        color: #bfd2ff;
      }
      .dash-nav {
        display: grid;
        gap: 8px;
      }
      .dash-nav a {
        text-decoration: none;
        color: #d6e3ff;
        font-weight: 600;
        font-size: 14px;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid transparent;
      }
      .dash-nav a.active {
        background: #99bc3a;
        color: #0f172a;
      }
      .dash-nav a:hover {
        border-color: rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.08);
      }
      .dash-main {
        background: linear-gradient(180deg, #f8fbff 0%, #f2f6fb 100%);
        padding: 22px;
      }
      .dash-top {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        align-items: center;
        margin-bottom: 16px;
      }
      .dash-title {
        margin: 0;
        font-size: 28px;
        color: #0f172a;
        font-weight: 800;
      }
      .dash-sub {
        margin: 6px 0 0;
        color: #475569;
        font-size: 14px;
      }
      .dash-actions {
        display: flex;
        gap: 10px;
      }
      .dash-btn {
        border: 0;
        border-radius: 10px;
        padding: 10px 14px;
        font-weight: 700;
        cursor: pointer;
      }
      .dash-btn.primary {
        background: #99bc3a;
        color: #0f172a;
      }
      .dash-btn.secondary {
        background: #e7edf6;
        color: #1e293b;
      }
      .dash-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-top: 14px;
      }
      .dash-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 14px;
      }
      .dash-card h5 {
        margin: 0;
        color: #64748b;
        font-size: 12px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .dash-card p {
        margin: 8px 0 0;
        font-size: 30px;
        font-weight: 800;
        color: #0f172a;
      }
      .dash-card small {
        display: block;
        margin-top: 8px;
        color: #0f766e;
        font-weight: 600;
      }
      .dash-lower {
        margin-top: 14px;
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 12px;
      }
      .dash-panel {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 14px;
      }
      .dash-panel h4 {
        margin: 0;
        font-size: 17px;
        color: #0f172a;
      }
      .dash-panel .note {
        margin-top: 6px;
        color: #64748b;
        font-size: 13px;
      }
      .dash-list {
        margin: 12px 0 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 9px;
      }
      .dash-list li {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 10px;
        background: #f8fbff;
        font-size: 14px;
        color: #1e293b;
        display: flex;
        justify-content: space-between;
      }
      .dash-list code {
        background: #e8eef9;
        border-radius: 6px;
        padding: 2px 7px;
      }
      @media (max-width: 1080px) {
        .dash-shell { grid-template-columns: 1fr; }
        .dash-sidebar { display: none; }
        .dash-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .dash-lower { grid-template-columns: 1fr; }
      }
      @media (max-width: 640px) {
        .dash-grid { grid-template-columns: 1fr; }
      }
    </style>

    <div class="dash-shell">
      <aside class="dash-sidebar">
        <p class="dash-logo">Shree Jalaram</p>

        <div class="dash-profile">
          <h4>${safeUser.fullName !== "-" ? safeUser.fullName : safeUser.username}</h4>
          <p>${safeUser.email}</p>
          <p>Role: ${safeUser.role}</p>
        </div>

        <nav class="dash-nav">
          <a href="${adminDashboardUrl}" class="${isDashboard ? "active" : ""}">Dashboard</a>
          <a href="${adminHomeUrl}" class="${isHome ? "active" : ""}">Home</a>
          <a href="${adminAboutUrl}" class="${isAbout ? "active" : ""}">About Us</a>
          <a href="${adminProjectsUrl}" class="${isProjects ? "active" : ""}">Projects</a>
          <a href="${adminInquiryUrl}" class="${isInquiry ? "active" : ""}">Inquiry</a>
          <a href="${adminSearchUrl}" class="${isSearch ? "active" : ""}">Search</a>
          <a href="${adminContactUrl}" class="${isContact ? "active" : ""}">Contact Info</a>
          <a href="${adminSeoUrl}" class="${isSeo ? "active" : ""}">SEO</a>
        </nav>
      </aside>

      <main class="dash-main">
        <div class="dash-top">
          <div>
            <h2 class="dash-title">${isHome ? "Home Section" : isAbout ? "About Us Section" : isProjects ? "Projects Section" : isInquiry ? "Inquiry Section" : isSearch ? "Search Section" : isSeo ? "SEO Section" : isContact ? "User Contact Details" : "Admin Dashboard"}</h2>
            <p class="dash-sub">
              ${isHome ? "Manage quick checks and links for public home experience." : isAbout ? "View and verify About page content from backend storage." : isProjects ? "Add/manage project cards and images from backend." : isInquiry ? "Configure the Project Details inquiry card defaults from backend." : isSearch ? "Edit the search page hero copy and optional filters from backend." : isSeo ? "Manage page-level SEO metadata directly from backend." : isContact ? "View contact form submissions from the website." : "Live control panel for your website data and operations."}
            </p>
          </div>
          <div class="dash-actions">
            <a class="dash-btn secondary" href="${adminRefreshUrl}" style="text-decoration:none;display:inline-block">Refresh</a>
            <form method="post" action="${adminLogoutUrl}" style="margin:0;display:inline-block">
              <button class="dash-btn primary" type="submit">Logout</button>
            </form>
          </div>
        </div>
        ${mainPanel}
      </main>
    </div>

    <script>
      (function () {
        const developedByInput = document.getElementById("developedBy");
        const contactTitleInput = document.getElementById("contactTitle");
        const contactButtonLabelInput = document.getElementById("contactButtonLabel");
        const contactNoteInput = document.getElementById("contactNote");

        const developedByPreview = document.getElementById("contactPreviewDevelopedBy");
        const contactTitlePreview = document.getElementById("contactPreviewTitle");
        const contactButtonPreview = document.getElementById("contactPreviewButton");
        const contactNotePreview = document.getElementById("contactPreviewNote");

        if (!developedByInput || !contactTitleInput || !contactButtonLabelInput || !contactNoteInput) {
          return;
        }

        const syncPreview = function () {
          if (developedByPreview) {
            developedByPreview.textContent = developedByInput.value || "Shree Jalaram Estate Agency";
          }

          if (contactTitlePreview) {
            contactTitlePreview.textContent = contactTitleInput.value || "Please share your contact";
          }

          if (contactButtonPreview) {
            contactButtonPreview.textContent = contactButtonLabelInput.value || "Get Offer";
          }

          if (contactNotePreview) {
            contactNotePreview.textContent = contactNoteInput.value || "Limited time offers available";
          }
        };

        [developedByInput, contactTitleInput, contactButtonLabelInput, contactNoteInput].forEach(function (input) {
          input.addEventListener("input", syncPreview);
        });

        syncPreview();
      })();

      (function () {
        const fileInput = document.getElementById("projectImageFiles");
        const previewContainer = document.getElementById("imagePreviewContainer");

        if (!fileInput || !previewContainer) {
          return;
        }

        const renderPreviews = function () {
          const files = fileInput.files || [];

          if (files.length === 0) {
            previewContainer.innerHTML = '<p style="grid-column:1/-1;color:#64748b;font-size:13px;margin:0">Select images above to see preview. These will appear as a carousel on the project details page.</p>';
            return;
          }

          previewContainer.innerHTML = '';

          Array.from(files).forEach(function (file, index) {
            const reader = new FileReader();

            reader.onload = function (event) {
              const img = document.createElement("img");
              img.src = event.target.result;
              img.style.cssText = "width:100%;height:120px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1";
              img.alt = "Preview " + (index + 1);
              previewContainer.appendChild(img);
            };

            reader.readAsDataURL(file);
          });
        };

        fileInput.addEventListener("change", renderPreviews);
      })();

      (function () {
        const aboutVideoInput = document.getElementById("aboutOverviewVideo");
        const aboutVideoPlayer = document.getElementById("aboutVideoPlayer");
        const aboutVideoPlaceholder = document.getElementById("aboutVideoPlaceholder");

        if (!aboutVideoInput || !aboutVideoPlayer || !aboutVideoPlaceholder) {
          return;
        }

        const updateVideoPreview = function () {
          const file = aboutVideoInput.files && aboutVideoInput.files[0];

          if (!file) {
            aboutVideoPlaceholder.style.display = "flex";
            aboutVideoPlayer.style.display = "none";
            return;
          }

          const reader = new FileReader();

          reader.onload = function (event) {
            aboutVideoPlayer.src = event.target.result;
            aboutVideoPlaceholder.style.display = "none";
            aboutVideoPlayer.style.display = "block";
          };

          reader.readAsDataURL(file);
        };

        aboutVideoInput.addEventListener("change", updateVideoPreview);
      })();
    </script>
  `;

  return renderLayout("Admin Dashboard", body);
}

adminPanelRouter.get("/", (_req, res) => {
  return res.redirect("/admin/signin");
});

async function handleSignup(req, res) {
  try {
    const source = req.method === "GET" ? req.query : req.body;
    const { username, fullName, email, password, mobile } = source;

    if (req.method === "GET" && !username && !fullName && !email && !password && !mobile) {
      return res.status(200).send(renderAuthPage("signup", "", { adminBaseUrl: `${getBaseUrl(req)}/admin` }));
    }

    if (!username || !fullName || !email || !password || !mobile) {
      return res.status(400).send(renderAuthPage("signup", "Please fill in all fields.", { adminBaseUrl: `${getBaseUrl(req)}/admin` }));
    }

    // Keep admin panel in single-admin mode: only first admin account can be created.
    const existingAdmin = await User.findOne({ role: "admin" }).lean();
    if (existingAdmin) {
      return res.status(409).send(
        renderAuthPage(
          "signup",
          "Admin account already exists. Please sign in with existing admin credentials.",
          { adminBaseUrl: `${getBaseUrl(req)}/admin` }
        )
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedUsername = String(username).trim();

    const existing = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existing) {
      return res.status(409).send(renderAuthPage("signup", "Email or username already exists.", { adminBaseUrl: `${getBaseUrl(req)}/admin` }));
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      username: normalizedUsername,
      fullName: String(fullName).trim(),
      email: normalizedEmail,
      mobile: String(mobile).trim(),
      passwordHash,
      role: "admin",
    });

    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ sub: user._id.toString(), role: user.role });

    user.refreshToken = refreshToken;
    await user.save();
    applyAuthCookies(res, accessToken, refreshToken);

    return res.redirect("/admin/dashboard");
  } catch (error) {
    return res.status(500).send(renderAuthPage("signup", "Unable to create account right now.", { adminBaseUrl: `${getBaseUrl(req)}/admin` }));
  }
}

async function handleSignin(req, res) {
  try {
    const source = req.method === "GET" ? req.query : req.body;
    const { email, password } = source;

    if (req.method === "GET" && !email && !password) {
      return res.status(200).send(renderAuthPage("signin", "", { adminBaseUrl: `${getBaseUrl(req)}/admin` }));
    }

    if (!email || !password) {
      return res.status(400).send(renderAuthPage("signin", "Please enter email and password.", { adminBaseUrl: `${getBaseUrl(req)}/admin` }));
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });

    if (!user) {
      return res.status(401).send(renderAuthPage("signin", "Invalid email or password.", { adminBaseUrl: `${getBaseUrl(req)}/admin` }));
    }

    const isMatch = await bcrypt.compare(String(password), user.passwordHash);

    if (!isMatch) {
      return res.status(401).send(renderAuthPage("signin", "Invalid email or password.", { adminBaseUrl: `${getBaseUrl(req)}/admin` }));
    }

    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ sub: user._id.toString(), role: user.role });

    user.refreshToken = refreshToken;
    await user.save();
    applyAuthCookies(res, accessToken, refreshToken);

    return res.redirect("/admin/dashboard");
  } catch (error) {
    return res.status(500).send(renderAuthPage("signin", "Unable to sign in right now.", { adminBaseUrl: `${getBaseUrl(req)}/admin` }));
  }
}

adminPanelRouter.all("/signup", handleSignup);
adminPanelRouter.all("/signin", handleSignin);

async function renderDashboardBySection(req, res) {
  const rawSection = String(req.params.section || req.query.section || "dashboard").toLowerCase();
  const section = ["dashboard", "home", "about", "projects", "inquiry", "search", "seo", "contact"].includes(rawSection) ? rawSection : "dashboard";

  let aboutStory = null;
  let homeStory = null;
  let inquirySettings = null;
  let searchSettings = null;
  let seoSettings = null;
  let contactInfo = null;
  let projects = [];
  let inquiries = [];
  const homeSaved = req.query.saved === "1";
  const aboutSaved = req.query.saved === "1";
  const projectSaved = req.query.saved === "1";
  const inquirySaved = req.query.saved === "1";
  const searchSaved = req.query.saved === "1";
  const seoSaved = req.query.saved === "1";
  const contactSaved = req.query.saved === "1";

  if (section === "home") {
    const content = await Content.findOneAndUpdate(
      { key: "home.story" },
      {
        $setOnInsert: {
          payload: {
            kicker: "Premium Real Estate Solutions",
            title: "Your Dream Property Awaits Here",
            description: "Discover curated properties in Surat's prime locations.",
            primaryLabel: "Explore Properties",
            primaryPath: "/search",
            secondaryLabel: "Talk to Advisor",
            secondaryPath: "/contactus",
            image: "/house.png",
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    homeStory = content?.payload || null;
  }

  if (section === "about") {
    const content = await Content.findOneAndUpdate(
      { key: "about.story" },
      {
        $setOnInsert: {
          payload: {
            kicker: "About The Story Behind Us",
            title: "We shape spaces that stand for quality, trust, and long-term value.",
            intro:
              "Shree Jalaram Estate Agency is a dynamic real estate organization committed to delivering thoughtfully designed developments.",
            details:
              "With over 14 years of industry experience, we focus on strong planning and lasting value.",
            stats: [
              { value: "100+", label: "Delivered Projects" },
              { value: "14+ Years", label: "of Industry Excellence" },
              { value: "25", label: "Award-winning Agents" },
            ],
            ctaLabel: "Know More About Us",
            ctaPath: "/aboutus",
            heroImage: "/house.png",
            heroImageAlt: "About hero image",
            insetImage: "/Logo.png",
            insetImageAlt: "About inset image",
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    aboutStory = content?.payload || null;
  }

  if (section === "projects") {
    projects = await Project.find().sort({ createdAt: -1 }).lean();
  }

  if (section === "inquiry") {
    const content = await Content.findOneAndUpdate(
      { key: "inquiry.settings" },
      {
        $setOnInsert: {
          payload: defaultInquirySettings,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    inquirySettings = {
      ...defaultInquirySettings,
      ...(content?.payload || {}),
    };

    inquiries = await Inquiry.find()
      .populate("projectId", "title")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
  }

  if (section === "search") {
    const content = await Content.findOneAndUpdate(
      { key: "search.settings" },
      {
        $setOnInsert: {
          payload: defaultSearchSettings,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    searchSettings = {
      ...defaultSearchSettings,
      ...(content?.payload || {}),
    };
  }

  if (section === "seo") {
    const content = await Content.findOneAndUpdate(
      { key: "seo.settings" },
      { $setOnInsert: { payload: defaultSeoSettings } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    seoSettings = content?.payload || defaultSeoSettings;
  }

  if (section === "contact") {
    const content = await Content.findOneAndUpdate(
      { key: "contact.info" },
      {
        $setOnInsert: {
          payload: {
            email: "shreejalarmestateagency@gmail.com",
            phone: "+91 98980 82218",
            address: "117, Mahalaxmi Square, Near L.P Savani Circle, Adajan, Surat, Gujarat 395009",
            facebook: "",
            instagram: "",
            whatsapp: "https://wa.me/919898082218",
            youtube: "",
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    contactInfo = {
      email: "shreejalarmestateagency@gmail.com",
      phone: "+91 98980 82218",
      address: "117, Mahalaxmi Square, Near L.P Savani Circle, Adajan, Surat, Gujarat 395009",
      facebook: "",
      instagram: "",
      whatsapp: "https://wa.me/919898082218",
      youtube: "",
      ...(content?.payload || {}),
    };

    inquiries = await Inquiry.find({ type: "contact" })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  }

  return res.status(200).send(renderDashboard(req.user, {
    section,
    aboutStory,
    homeStory,
    inquirySettings,
    seoSettings,
    searchSettings,
    contactInfo,
    projects,
    inquiries,
    homeSaved,
    aboutSaved,
    projectSaved,
    inquirySaved,
    searchSaved,
    seoSaved,
    contactSaved,
    frontendOrigin: env.frontendOrigin || "http://localhost:5173",
    adminBaseUrl: getBaseUrl(req) + "/admin",
    currentPath: req.originalUrl || "/admin/dashboard",
  }));
}

adminPanelRouter.get("/dashboard", requireAuth, requireRole("admin"), renderDashboardBySection);
adminPanelRouter.get("/dashboard/:section", requireAuth, requireRole("admin"), renderDashboardBySection);
adminPanelRouter.get("/dashboard/*rest", requireAuth, requireRole("admin"), (req, res) => {
  const rawPath = String(req.originalUrl || "").toLowerCase();
  const knownSections = ["home", "about", "projects", "inquiry", "search", "seo", "contact"];

  const matchedSection = knownSections.find((section) => rawPath.includes(`/dashboard/${section}`));

  if (matchedSection) {
    return res.redirect(`/admin/dashboard/${matchedSection}`);
  }

  return res.redirect("/admin/dashboard");
});

adminPanelRouter.post(
  "/dashboard/projects/add",
  requireAuth,
  requireRole("admin"),
  projectAssetsUpload.fields([
    { name: "projectImageFiles", maxCount: 10 },
    { name: "brochureFile", maxCount: 1 },
    { name: "videoFile", maxCount: 1 },
  ]),
  async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const description = String(req.body?.description || "").trim();
  const status = String(req.body?.status || "ONGOING").trim().toUpperCase();
  const location = String(req.body?.location || "").trim();
  const address = String(req.body?.address || "").trim();
  const projectType = String(req.body?.projectType || "").trim();
  const developedBy = String(req.body?.developedBy || "").trim();
  const files = req.files || {};
  const imageFiles = Array.isArray(files.projectImageFiles) ? files.projectImageFiles : [];
  const brochureFile = Array.isArray(files.brochureFile) ? files.brochureFile[0] : null;
  const videoFile = Array.isArray(files.videoFile) ? files.videoFile[0] : null;
  const uploadedImagePaths = imageFiles.map((file) => `/uploads/projects/${file.filename}`);
  const images = uploadedImagePaths;
  const brochureUrl = brochureFile ? `/uploads/projects/brochures/${brochureFile.filename}` : "";
  const amenities = parseLines(req.body?.amenities || "");
  const faqs = parseFaqLines(req.body?.faqs || "");
  const overview = {
    heading: String(req.body?.overviewHeading || "").trim(),
    highlight: String(req.body?.overviewHighlight || "").trim(),
    projectArea: String(req.body?.projectArea || "").trim(),
    configurations: String(req.body?.configurations || "").trim(),
    reraStatus: String(req.body?.reraStatus || "").trim(),
  };
  const locationDescription = String(req.body?.locationDescription || "").trim();
  const virtualTourUrl = videoFile ? `/uploads/projects/videos/${videoFile.filename}` : "";
  const virtualTourTitle = String(req.body?.virtualTourTitle || "").trim();
  const virtualTourDescription = String(req.body?.virtualTourDescription || "").trim();
  const contactTitle = String(req.body?.contactTitle || "").trim();
  const contactButtonLabel = String(req.body?.contactButtonLabel || "").trim();
  const contactNote = String(req.body?.contactNote || "").trim();

  if (
    !title || !description || !location || !address || !projectType || !developedBy
    || !overview.heading || !overview.highlight || !overview.projectArea || !overview.configurations || !overview.reraStatus
    || !contactTitle || !contactButtonLabel || !contactNote
  ) {
    return res.redirect("/admin/dashboard/projects");
  }

  await Project.create({
    title,
    description,
    status: status === "COMPLETED" ? "COMPLETED" : "ONGOING",
    location,
    address,
    projectType,
    developedBy,
    images,
    brochureUrl,
    overview,
    amenities,
    locationDescription,
    virtualTourUrl,
    virtualTourTitle,
    virtualTourDescription,
    faqs,
    contactTitle,
    contactButtonLabel,
    contactNote,
  });

  return res.redirect("/admin/dashboard/projects?saved=1");
}
);

adminPanelRouter.post("/dashboard/projects/delete/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  return res.redirect("/admin/dashboard/projects");
});

adminPanelRouter.post("/dashboard/search/save", requireAuth, requireRole("admin"), async (req, res) => {
  const current = await Content.findOne({ key: "search.settings" }).lean();
  const existingPayload = current?.payload || {};

  const payload = {
    pageTitle: String(req.body?.pageTitle || "").trim(),
    pageDescription: String(req.body?.pageDescription || "").trim(),
    heroImage: String(existingPayload.heroImage || defaultSearchSettings.heroImage || "").trim(),
    transactionTypeOptions: parseLines(req.body?.transactionTypeOptions || ""),
    propertyTypeOptions: parseLines(req.body?.propertyTypeOptions || ""),
    categoryResidential: parseLines(req.body?.categoryResidential || ""),
    categoryCommercial: parseLines(req.body?.categoryCommercial || ""),
    showPropertySubtype: Boolean(req.body?.showPropertySubtype),
    showBathrooms: Boolean(req.body?.showBathrooms),
    propertySubtypeResidential: parseLines(req.body?.propertySubtypeResidential || ""),
    propertySubtypeCommercial: parseLines(req.body?.propertySubtypeCommercial || ""),
    bhkOptions: parseLines(req.body?.bhkOptions || ""),
    bathroomOptions: Array.isArray(existingPayload.bathroomOptions) && existingPayload.bathroomOptions.length
      ? existingPayload.bathroomOptions
      : defaultSearchSettings.bathroomOptions,
  };

  if (!payload.pageTitle || !payload.pageDescription) {
    return res.redirect("/admin/dashboard/search");
  }

  await Content.findOneAndUpdate(
    { key: "search.settings" },
    { $set: { payload } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.redirect("/admin/dashboard/search?saved=1");
});

adminPanelRouter.post(
  "/dashboard/search/upload-image",
  requireAuth,
  requireRole("admin"),
  searchImageUpload.single("searchHeroImage"),
  async (req, res) => {
    if (!req.file) {
      return res.redirect("/admin/dashboard/search");
    }

    const current = await Content.findOne({ key: "search.settings" }).lean();
    const existingPayload = current?.payload || {};

    await Content.findOneAndUpdate(
      { key: "search.settings" },
      {
        $set: {
          payload: {
            ...defaultSearchSettings,
            ...existingPayload,
            heroImage: `/uploads/search/${req.file.filename}`,
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.redirect("/admin/dashboard/search?saved=1");
  }
);

adminPanelRouter.post("/dashboard/inquiry/save", requireAuth, requireRole("admin"), async (req, res) => {
  const payload = {
    developedByLabel: String(req.body?.developedByLabel || "").trim(),
    developedByDefault: String(req.body?.developedByDefault || "").trim(),
    cardTitle: String(req.body?.cardTitle || "").trim(),
    buttonLabel: String(req.body?.buttonLabel || "").trim(),
    note: String(req.body?.note || "").trim(),
  };

  const hasInvalidField =
    !payload.developedByLabel
    || !payload.developedByDefault
    || !payload.cardTitle
    || !payload.buttonLabel
    || !payload.note;

  if (hasInvalidField) {
    return res.redirect("/admin/dashboard/inquiry");
  }

  await Content.findOneAndUpdate(
    { key: "inquiry.settings" },
    { $set: { payload } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.redirect("/admin/dashboard/inquiry?saved=1");
});

adminPanelRouter.post("/dashboard/inquiry/delete/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await Inquiry.findByIdAndDelete(req.params.id);
  return res.redirect("/admin/dashboard/inquiry");
});

adminPanelRouter.post("/dashboard/seo/save", requireAuth, requireRole("admin"), async (req, res) => {
  const seoPages = ["home", "projects", "aboutus", "contactus", "search", "residential", "commercial", "reviews"];
  const payload = seoPages.reduce((acc, key) => {
    acc[key] = {
      title: String(req.body?.[`${key}_title`] || "").trim(),
      description: String(req.body?.[`${key}_description`] || "").trim(),
    };
    return acc;
  }, {});

  const hasInvalidField = seoPages.some((key) => !payload[key].title || !payload[key].description);

  if (hasInvalidField) {
    return res.redirect("/admin/dashboard/seo");
  }

  await Content.findOneAndUpdate(
    { key: "seo.settings" },
    { $set: { payload } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.redirect("/admin/dashboard/seo?saved=1");
});

adminPanelRouter.post("/dashboard/home/save", requireAuth, requireRole("admin"), async (req, res) => {
  const current = await Content.findOne({ key: "home.story" }).lean();

  const payload = {
    kicker: String(req.body?.kicker || "").trim(),
    title: String(req.body?.title || "").trim(),
    description: String(req.body?.description || "").trim(),
    primaryLabel: String(req.body?.primaryLabel || "").trim(),
    primaryPath: String(req.body?.primaryPath || "").trim(),
    secondaryLabel: String(req.body?.secondaryLabel || "").trim(),
    secondaryPath: String(req.body?.secondaryPath || "").trim(),
    image: current?.payload?.image || "/image.png",
  };

  if (!payload.kicker || !payload.title || !payload.description) {
    return res.redirect("/admin/dashboard/home");
  }

  await Content.findOneAndUpdate(
    { key: "home.story" },
    { $set: { payload } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.redirect("/admin/dashboard/home?saved=1");
});

adminPanelRouter.post(
  "/dashboard/home/upload-image",
  requireAuth,
  requireRole("admin"),
  homeImageUpload.single("homeImage"),
  async (req, res) => {
    if (!req.file) {
      return res.redirect("/admin/dashboard/home");
    }

    const current = await Content.findOne({ key: "home.story" }).lean();
    const existingPayload = current?.payload || {};

    await Content.findOneAndUpdate(
      { key: "home.story" },
      {
        $set: {
          payload: {
            kicker: existingPayload.kicker || "Premium Real Estate Solutions",
            title: existingPayload.title || "Your Dream Property Awaits Here",
            description: existingPayload.description || "Discover curated properties in Surat's prime locations.",
            primaryLabel: existingPayload.primaryLabel || "Explore Properties",
            primaryPath: existingPayload.primaryPath || "/search",
            secondaryLabel: existingPayload.secondaryLabel || "Talk to Advisor",
            secondaryPath: existingPayload.secondaryPath || "/contactus",
            image: `/uploads/home/${req.file.filename}`,
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.redirect("/admin/dashboard/home?saved=1");
  }
);

adminPanelRouter.post("/dashboard/about/save", requireAuth, requireRole("admin"), async (req, res) => {
  const current = await Content.findOne({ key: "about.story" }).lean();
  const existingPayload = current?.payload || {};

  const payload = {
    kicker: String(req.body?.kicker || "").trim(),
    title: String(req.body?.title || "").trim(),
    intro: String(req.body?.intro || "").trim(),
    details: String(req.body?.details || "").trim(),
    stats: [
      { value: String(req.body?.stat1Value || "").trim(), label: String(req.body?.stat1Label || "").trim() },
      { value: String(req.body?.stat2Value || "").trim(), label: String(req.body?.stat2Label || "").trim() },
      { value: String(req.body?.stat3Value || "").trim(), label: String(req.body?.stat3Label || "").trim() },
    ],
    ctaLabel: String(req.body?.ctaLabel || "").trim(),
    ctaPath: String(req.body?.ctaPath || "").trim(),
    heroImage: existingPayload.heroImage || "/house.png",
    heroImageAlt: existingPayload.heroImageAlt || "About hero image",
    insetImage: existingPayload.insetImage || "/Logo.png",
    insetImageAlt: existingPayload.insetImageAlt || "About inset image",
    overviewVideoUrl: existingPayload.overviewVideoUrl || "",
  };

  if (!payload.kicker || !payload.title || !payload.intro || !payload.details || !payload.ctaLabel || !payload.ctaPath) {
    return res.redirect("/admin/dashboard/about");
  }

  await Content.findOneAndUpdate(
    { key: "about.story" },
    { $set: { payload } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.redirect("/admin/dashboard/about?saved=1");
});

adminPanelRouter.post(
  "/dashboard/about/upload-images",
  requireAuth,
  requireRole("admin"),
  aboutImageUpload.fields([
    { name: "heroImage", maxCount: 1 },
    { name: "insetImage", maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files || {};
    const heroFile = Array.isArray(files.heroImage) ? files.heroImage[0] : null;
    const insetFile = Array.isArray(files.insetImage) ? files.insetImage[0] : null;

    if (!heroFile && !insetFile) {
      return res.redirect("/admin/dashboard/about");
    }

    const current = await Content.findOne({ key: "about.story" }).lean();
    const existingPayload = current?.payload || {};

    await Content.findOneAndUpdate(
      { key: "about.story" },
      {
        $set: {
          payload: {
            kicker: existingPayload.kicker || "About The Story Behind Us",
            title: existingPayload.title || "We shape spaces that stand for quality, trust, and long-term value.",
            intro: existingPayload.intro || "Shree Jalaram Estate Agency is a dynamic real estate organization.",
            details: existingPayload.details || "With over 14 years of industry experience, our expertise spans projects.",
            stats: Array.isArray(existingPayload.stats) && existingPayload.stats.length >= 3
              ? existingPayload.stats
              : [
                { value: "100+", label: "Delivered Projects" },
                { value: "14+ Years", label: "of Industry Excellence" },
                { value: "25", label: "Award-winning Agents" },
              ],
            ctaLabel: existingPayload.ctaLabel || "Know More About Us",
            ctaPath: existingPayload.ctaPath || "/aboutus",
            heroImage: heroFile ? `/uploads/about/${heroFile.filename}` : (existingPayload.heroImage || "/house.png"),
            heroImageAlt: existingPayload.heroImageAlt || "About hero image",
            insetImage: insetFile ? `/uploads/about/${insetFile.filename}` : (existingPayload.insetImage || "/Logo.png"),
            insetImageAlt: existingPayload.insetImageAlt || "About inset image",
            overviewVideoUrl: existingPayload.overviewVideoUrl || "",
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.redirect("/admin/dashboard/about?saved=1");
  }
);

adminPanelRouter.post(
  "/dashboard/about/upload-video",
  requireAuth,
  requireRole("admin"),
  aboutVideoUpload.single("overviewVideo"),
  async (req, res) => {
    const videoFile = req.file || null;

    const current = await Content.findOne({ key: "about.story" }).lean();
    const existingPayload = current?.payload || {};

    const videoUrl = videoFile ? `/uploads/about/videos/${videoFile.filename}` : (existingPayload.overviewVideoUrl || "");

    await Content.findOneAndUpdate(
      { key: "about.story" },
      {
        $set: {
          payload: {
            kicker: existingPayload.kicker || "About The Story Behind Us",
            title: existingPayload.title || "We shape spaces that stand for quality, trust, and long-term value.",
            intro: existingPayload.intro || "Shree Jalaram Estate Agency is a dynamic real estate organization.",
            details: existingPayload.details || "With over 14 years of industry experience, our expertise spans projects.",
            stats: Array.isArray(existingPayload.stats) && existingPayload.stats.length >= 3
              ? existingPayload.stats
              : [
                { value: "100+", label: "Delivered Projects" },
                { value: "14+ Years", label: "of Industry Excellence" },
                { value: "25", label: "Award-winning Agents" },
              ],
            ctaLabel: existingPayload.ctaLabel || "Know More About Us",
            ctaPath: existingPayload.ctaPath || "/aboutus",
            heroImage: existingPayload.heroImage || "/house.png",
            heroImageAlt: existingPayload.heroImageAlt || "About hero image",
            insetImage: existingPayload.insetImage || "/Logo.png",
            insetImageAlt: existingPayload.insetImageAlt || "About inset image",
            overviewVideoUrl: videoUrl,
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.redirect("/admin/dashboard/about?saved=1");
  }
);

adminPanelRouter.post("/dashboard/contact/save", requireAuth, requireRole("admin"), async (req, res) => {
  const payload = {
    email: String(req.body?.email || "").trim(),
    phone: String(req.body?.phone || "").trim(),
    address: String(req.body?.address || "").trim(),
    facebook: String(req.body?.facebook || "").trim(),
    instagram: String(req.body?.instagram || "").trim(),
    whatsapp: String(req.body?.whatsapp || "").trim(),
    youtube: String(req.body?.youtube || "").trim(),
  };

  const hasInvalidField = !payload.email || !payload.phone || !payload.address;

  if (hasInvalidField) {
    return res.redirect("/admin/dashboard/contact");
  }

  await Content.findOneAndUpdate(
    { key: "contact.info" },
    { $set: { payload } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.redirect("/admin/dashboard/contact?saved=1");
});

adminPanelRouter.post("/dashboard/contact/delete/:id", requireAuth, requireRole("admin"), async (req, res) => {
  await Inquiry.findByIdAndDelete(req.params.id);
  return res.redirect("/admin/dashboard/contact");
});

adminPanelRouter.post("/logout", (_req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return res.redirect("/admin/signin");
});
