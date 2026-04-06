import { randomUUID } from "crypto";
import { query } from "../../config/db.js";
import { buildPredicate, createQuery } from "./_sql.js";

const INQUIRY_COLUMNS = {
  _id: "i.id",
  id: "i.id",
  type: "i.type",
  name: "i.name",
  mobile: "i.mobile",
  email: "i.email",
  message: "i.message",
  consent: "i.consent",
  projectId: "i.project_id",
  createdAt: "i.created_at",
  updatedAt: "i.updated_at",
};

const INQUIRY_SELECT = `
  i.id as "_id",
  i.id as id,
  i.type,
  i.name,
  i.mobile,
  i.email,
  i.message,
  i.consent,
  i.project_id as "projectId",
  i.created_at as "createdAt",
  i.updated_at as "updatedAt"
`;

function normalizeInquiryInput(data = {}) {
  return {
    type: data.type || "contact",
    name: String(data.name || "").trim(),
    mobile: String(data.mobile || "").trim(),
    email: String(data.email || "").trim().toLowerCase(),
    message: String(data.message || "").trim(),
    consent: Boolean(data.consent),
    project_id: data.projectId || data.project_id || null,
  };
}

async function fetchInquiries(filter = {}) {
  const params = [];
  const where = buildPredicate(filter, INQUIRY_COLUMNS, params);
  const { rows } = await query(`select ${INQUIRY_SELECT} from inquiries i ${where ? `where ${where}` : ""}`, params);
  return rows;
}

export const Inquiry = {
  find(filter = {}) {
    return createQuery(async () => fetchInquiries(filter));
  },
  async create(data = {}) {
    const payload = normalizeInquiryInput(data);
    await query(
      `
        insert into inquiries (id, type, name, mobile, email, message, consent, project_id)
        values (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [data.id || data._id || randomUUID(), payload.type, payload.name, payload.mobile, payload.email, payload.message, payload.consent, payload.project_id]
    );

    const rows = await fetchInquiries({ _id: data.id || data._id || undefined, mobile: payload.mobile, email: payload.email });
    return rows[0] || null;
  },
  async findByIdAndDelete(id) {
    const existing = (await fetchInquiries({ _id: id }))[0] || null;
    if (!existing) {
      return null;
    }

    await query(`delete from inquiries where id = ?`, [id]);
    return { _id: existing._id };
  },
  async deleteMany(filter = {}) {
    const params = [];
    const where = buildPredicate(filter, INQUIRY_COLUMNS, params);
    const result = await query(`delete from inquiries ${where ? `where ${where}` : ""}`, params);
    return { deletedCount: result.rowCount };
  },
};
