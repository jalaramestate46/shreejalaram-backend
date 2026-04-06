import { randomUUID } from "crypto";
import { query } from "../../config/db.js";
import { buildPredicate, createQuery } from "./_sql.js";

const REVIEW_COLUMNS = {
  _id: "r.id",
  id: "r.id",
  name: "r.name",
  phone: "r.phone",
  rating: "r.rating",
  testimonial: "r.testimonial",
  image: "r.image",
  createdAt: "r.created_at",
  updatedAt: "r.updated_at",
};

const REVIEW_SELECT = `
  r.id as "_id",
  r.id as id,
  r.name,
  r.phone,
  r.rating,
  r.testimonial,
  r.image,
  r.created_at as "createdAt",
  r.updated_at as "updatedAt"
`;

function normalizeReviewInput(data = {}) {
  return {
    name: String(data.name || "").trim(),
    phone: String(data.phone || "").trim(),
    rating: Number(data.rating || 5),
    testimonial: String(data.testimonial || "").trim(),
    image: String(data.image || "").trim(),
  };
}

async function fetchReviews(filter = {}) {
  const params = [];
  const where = buildPredicate(filter, REVIEW_COLUMNS, params);
  const { rows } = await query(`select ${REVIEW_SELECT} from public.reviews r ${where ? `where ${where}` : ""}`, params);
  return rows;
}

export const Review = {
  find(filter = {}) {
    return createQuery(async () => fetchReviews(filter));
  },
  async create(data = {}) {
    const payload = normalizeReviewInput(data);
    const result = await query(
      `
        insert into public.reviews (id, name, phone, rating, testimonial, image)
        values ($1, $2, $3, $4, $5, $6)
        returning ${REVIEW_SELECT}
      `,
      [data.id || data._id || randomUUID(), payload.name, payload.phone, payload.rating, payload.testimonial, payload.image]
    );

    return result.rows[0] || null;
  },
  async deleteMany(filter = {}) {
    const params = [];
    const where = buildPredicate(filter, REVIEW_COLUMNS, params);
    const result = await query(`delete from public.reviews ${where ? `where ${where}` : ""}`, params);
    return { deletedCount: result.rowCount };
  },
};