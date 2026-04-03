import { Project } from "../models/Project.js";
import { Property } from "../models/Property.js";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import slugify from "slugify";

function createPropertyPath(property) {
  const slug = slugify(property?.title || "property", { lower: true, strict: true });
  return `/property/${property._id}${slug ? `-${slug}` : ""}`;
}

function createProjectPath(project) {
  return `/project/${project.slug || project._id}`;
}

function getStaticUrls() {
  return [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/search", changefreq: "weekly", priority: "0.8" },
    { path: "/projects", changefreq: "weekly", priority: "0.9" },
    { path: "/aboutus", changefreq: "monthly", priority: "0.7" },
    { path: "/contactus", changefreq: "monthly", priority: "0.8" },
    { path: "/reviews", changefreq: "weekly", priority: "0.6" },
    { path: "/residential", changefreq: "weekly", priority: "0.9" },
    { path: "/commercial", changefreq: "weekly", priority: "0.9" },
  ];
}

async function getSeoRouteManifest() {
  const [projects, properties] = await Promise.all([
    Project.find().select("title slug updatedAt").sort({ updatedAt: -1 }).lean(),
    Property.find().select("_id title updatedAt").sort({ updatedAt: -1 }).lean(),
  ]);

  return [
    ...getStaticUrls().map((item) => ({
      ...item,
      lastmod: new Date().toISOString(),
      type: "static",
    })),
    ...projects.map((project) => ({
      path: createProjectPath(project),
      changefreq: "weekly",
      priority: "0.8",
      lastmod: (project.updatedAt || new Date()).toISOString(),
      type: "project",
      title: project.title,
    })),
    ...properties.map((property) => ({
      path: createPropertyPath(property),
      changefreq: "weekly",
      priority: "0.7",
      lastmod: (property.updatedAt || new Date()).toISOString(),
      type: "property",
      title: property.title,
    })),
  ];
}

export const getRobotsTxt = asyncHandler(async (_req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *\nAllow: /\n\nHost: ${env.siteUrl}\nSitemap: ${env.siteUrl}/sitemap.xml\n`);
});

export const getSitemapXml = asyncHandler(async (_req, res) => {
  const urls = await getSeoRouteManifest();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      (item) => `  <url>\n    <loc>${env.siteUrl}${item.path}</loc>\n    <lastmod>${item.lastmod}</lastmod>\n    <changefreq>${item.changefreq}</changefreq>\n    <priority>${item.priority}</priority>\n  </url>`
    )
    .join("\n")}\n</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).send(xml);
});

export const getSeoRoutes = asyncHandler(async (_req, res) => {
  const routes = await getSeoRouteManifest();

  res.status(200).json({
    success: true,
    data: routes,
  });
});
