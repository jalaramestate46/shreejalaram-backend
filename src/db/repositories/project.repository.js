import { randomUUID } from "crypto";
import slugify from "slugify";
import { query } from "../../config/db.js";
import { buildPredicate, createQuery, parseJsonField, stringifyJson } from "./_sql.js";

const PROJECT_COLUMNS = {
  _id: "p.id",
  id: "p.id",
  slug: "p.slug",
  title: "p.title",
  description: "p.description",
  status: "p.status",
  location: "p.location",
  address: "p.address",
  projectType: "p.project_type",
  developedBy: "p.developed_by",
  createdAt: "p.created_at",
  updatedAt: "p.updated_at",
};

const PROJECT_SELECT = `
  p.id as "_id",
  p.id as id,
  p.title,
  p.slug,
  p.description,
  p.status,
  p.location,
  p.address,
  p.project_type as "projectType",
  p.developed_by as "developedBy",
  p.images,
  p.brochure_url as "brochureUrl",
  p.overview,
  p.amenities,
  p.location_description as "locationDescription",
  p.virtual_tour_url as "virtualTourUrl",
  p.virtual_tour_title as "virtualTourTitle",
  p.virtual_tour_description as "virtualTourDescription",
  p.faqs,
  p.contact_title as "contactTitle",
  p.contact_note as "contactNote",
  p.contact_button_label as "contactButtonLabel",
  p.created_at as "createdAt",
  p.updated_at as "updatedAt"
`;

function normalizeProjectCreate(data = {}) {
  const title = String(data.title || "").trim();

  return {
    id: data.id || data._id || randomUUID(),
    title,
    slug: String(data.slug || "").trim() || (title ? slugify(title, { lower: true, strict: true }) : ""),
    description: String(data.description || "").trim(),
    status: data.status || "ONGOING",
    location: String(data.location || "").trim(),
    address: String(data.address || "").trim(),
    project_type: String(data.projectType || data.project_type || "Premium Development").trim(),
    developed_by: String(data.developedBy || data.developed_by || "Shree Jalaram Estate Agency").trim(),
    images: Array.isArray(data.images) ? data.images : [],
    brochure_url: String(data.brochureUrl || data.brochure_url || "").trim(),
    overview: data.overview && typeof data.overview === "object" ? data.overview : {},
    amenities: Array.isArray(data.amenities) ? data.amenities : [],
    location_description: String(data.locationDescription || data.location_description || "").trim(),
    virtual_tour_url: String(data.virtualTourUrl || data.virtual_tour_url || "").trim(),
    virtual_tour_title: String(data.virtualTourTitle || data.virtual_tour_title || "").trim(),
    virtual_tour_description: String(data.virtualTourDescription || data.virtual_tour_description || "").trim(),
    faqs: Array.isArray(data.faqs) ? data.faqs : [],
    contact_title: String(data.contactTitle || data.contact_title || "Please share your contact").trim(),
    contact_note: String(data.contactNote || data.contact_note || "Limited time offers available").trim(),
    contact_button_label: String(data.contactButtonLabel || data.contact_button_label || "Get Offer").trim(),
  };
}

function mapProject(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    images: parseJsonField(row.images, []),
    overview: parseJsonField(row.overview, {}),
    amenities: parseJsonField(row.amenities, []),
    faqs: parseJsonField(row.faqs, []),
  };
}

async function fetchProjects(filter = {}) {
  const params = [];
  const where = buildPredicate(filter, PROJECT_COLUMNS, params);
  const { rows } = await query(`select ${PROJECT_SELECT} from projects p ${where ? `where ${where}` : ""}`, params);
  return rows.map(mapProject);
}

async function fetchProjectById(id) {
  const projects = await fetchProjects({ _id: id });
  return projects[0] || null;
}

async function fetchProjectBySlug(slug) {
  const projects = await fetchProjects({ slug });
  return projects[0] || null;
}

function normalizeUpdatePayload(data = {}) {
  const update = {};

  if (data.title !== undefined) {
    update.title = String(data.title || "").trim();
  }

  if (data.slug !== undefined) {
    update.slug = String(data.slug || "").trim();
  }

  if (data.description !== undefined) {
    update.description = String(data.description || "").trim();
  }

  if (data.status !== undefined) {
    update.status = data.status;
  }

  if (data.location !== undefined) {
    update.location = String(data.location || "").trim();
  }

  if (data.address !== undefined) {
    update.address = String(data.address || "").trim();
  }

  if (data.projectType !== undefined || data.project_type !== undefined) {
    update.project_type = String(data.projectType || data.project_type || "").trim();
  }

  if (data.developedBy !== undefined || data.developed_by !== undefined) {
    update.developed_by = String(data.developedBy || data.developed_by || "").trim();
  }

  if (data.images !== undefined) {
    update.images = Array.isArray(data.images) ? data.images : [];
  }

  if (data.brochureUrl !== undefined || data.brochure_url !== undefined) {
    update.brochure_url = String(data.brochureUrl || data.brochure_url || "").trim();
  }

  if (data.overview !== undefined) {
    update.overview = data.overview && typeof data.overview === "object" ? data.overview : {};
  }

  if (data.amenities !== undefined) {
    update.amenities = Array.isArray(data.amenities) ? data.amenities : [];
  }

  if (data.locationDescription !== undefined || data.location_description !== undefined) {
    update.location_description = String(data.locationDescription || data.location_description || "").trim();
  }

  if (data.virtualTourUrl !== undefined || data.virtual_tour_url !== undefined) {
    update.virtual_tour_url = String(data.virtualTourUrl || data.virtual_tour_url || "").trim();
  }

  if (data.virtualTourTitle !== undefined || data.virtual_tour_title !== undefined) {
    update.virtual_tour_title = String(data.virtualTourTitle || data.virtual_tour_title || "").trim();
  }

  if (data.virtualTourDescription !== undefined || data.virtual_tour_description !== undefined) {
    update.virtual_tour_description = String(data.virtualTourDescription || data.virtual_tour_description || "").trim();
  }

  if (data.faqs !== undefined) {
    update.faqs = Array.isArray(data.faqs) ? data.faqs : [];
  }

  if (data.contactTitle !== undefined || data.contact_title !== undefined) {
    update.contact_title = String(data.contactTitle || data.contact_title || "").trim();
  }

  if (data.contactNote !== undefined || data.contact_note !== undefined) {
    update.contact_note = String(data.contactNote || data.contact_note || "").trim();
  }

  if (data.contactButtonLabel !== undefined || data.contact_button_label !== undefined) {
    update.contact_button_label = String(data.contactButtonLabel || data.contact_button_label || "").trim();
  }

  if (update.title && !update.slug) {
    update.slug = slugify(update.title, { lower: true, strict: true });
  }

  return update;
}

async function updateProject(id, payload = {}) {
  const update = normalizeUpdatePayload(payload);
  const fields = [];
  const values = [];

  for (const [field, value] of Object.entries(update)) {
    fields.push(`${field} = ?`);
    values.push(["images", "overview", "amenities", "faqs"].includes(field) ? stringifyJson(value, Array.isArray(value) ? [] : {}) : value);
  }

  if (fields.length === 0) {
    return fetchProjectById(id);
  }

  const result = await query(
    `
      update projects
      set ${fields.join(", ")}, updated_at = utc_timestamp()
      where id = ?
    `,
    [...values, id]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return fetchProjectById(id);
}

export const Project = {
  find(filter = {}) {
    return createQuery(async () => fetchProjects(filter));
  },
  findOne(filter = {}) {
    return createQuery(async () => {
      const rows = await fetchProjects(filter);
      return rows[0] || null;
    });
  },
  findById(id) {
    return createQuery(async () => fetchProjectById(id));
  },
  findBySlug(slug) {
    return createQuery(async () => fetchProjectBySlug(slug));
  },
  async create(data = {}) {
    if (Array.isArray(data)) {
      const created = [];
      for (const item of data) {
        created.push(await Project.create(item));
      }
      return created;
    }

    const payload = normalizeProjectCreate(data);
    await query(
      `
        insert into projects (
          id, title, slug, description, status, location, address, project_type, developed_by,
          images, brochure_url, overview, amenities, location_description,
          virtual_tour_url, virtual_tour_title, virtual_tour_description, faqs,
          contact_title, contact_note, contact_button_label
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.id,
        payload.title,
        payload.slug,
        payload.description,
        payload.status,
        payload.location,
        payload.address,
        payload.project_type,
        payload.developed_by,
        stringifyJson(payload.images, []),
        payload.brochure_url,
        stringifyJson(payload.overview, {}),
        stringifyJson(payload.amenities, []),
        payload.location_description,
        payload.virtual_tour_url,
        payload.virtual_tour_title,
        payload.virtual_tour_description,
        stringifyJson(payload.faqs, []),
        payload.contact_title,
        payload.contact_note,
        payload.contact_button_label,
      ]
    );

    return fetchProjectById(payload.id);
  },
  findByIdAndUpdate(id, payload = {}) {
    return updateProject(id, payload);
  },
  async findByIdAndDelete(id) {
    const existing = await fetchProjectById(id);
    if (!existing) {
      return null;
    }

    await query(`delete from projects where id = ?`, [id]);
    return { _id: existing._id };
  },
  async deleteMany(filter = {}) {
    const params = [];
    const where = buildPredicate(filter, PROJECT_COLUMNS, params);
    const result = await query(`delete from projects ${where ? `where ${where}` : ""}`, params);
    return { deletedCount: result.rowCount };
  },
};
