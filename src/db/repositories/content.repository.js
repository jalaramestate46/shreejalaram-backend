import { query } from "../../config/db.js";
import { buildPredicate, createQuery } from "./_sql.js";

const CONTENT_COLUMNS = {
  key: "c.key",
  createdAt: "c.created_at",
  updatedAt: "c.updated_at",
};

const CONTENT_SELECT = `
  c.key,
  c.payload,
  c.created_at as "createdAt",
  c.updated_at as "updatedAt"
`;

async function fetchContent(filter = {}) {
  const params = [];
  const where = buildPredicate(filter, CONTENT_COLUMNS, params);
  const { rows } = await query(`select ${CONTENT_SELECT} from public.content c ${where ? `where ${where}` : ""}`, params);
  return rows;
}

function extractPayload(update = {}) {
  if (Object.prototype.hasOwnProperty.call(update, "payload")) return update.payload;
  if (update.$set && Object.prototype.hasOwnProperty.call(update.$set, "payload")) return update.$set.payload;
  if (update.$setOnInsert && Object.prototype.hasOwnProperty.call(update.$setOnInsert, "payload")) return update.$setOnInsert.payload;
  return undefined;
}

export const Content = {
  findOne(filter = {}) {
    return createQuery(async () => {
      const rows = await fetchContent(filter);
      return rows[0] || null;
    });
  },
  findOneAndUpdate(filter = {}, update = {}, options = {}) {
    return createQuery(async () => {
      const existingRows = await fetchContent(filter);
      const existing = existingRows[0] || null;
      const payload = extractPayload(update);

      if (!existing && !options.upsert) return null;

      if (!existing) {
        const key = filter.key;
        if (!key) return null;

        const inserted = await query(
          `
            insert into public.content (key, payload)
            values ($1, $2)
            on conflict (key) do update set payload = excluded.payload, updated_at = timezone('utc', now())
            returning ${CONTENT_SELECT}
          `,
          [key, payload ?? null]
        );

        return inserted.rows[0] || null;
      }

      if (payload === undefined) return existing;

      const updated = await query(
        `
          update public.content
          set payload = $2,
              updated_at = timezone('utc', now())
          where key = $1
          returning ${CONTENT_SELECT}
        `,
        [existing.key, payload]
      );

      return updated.rows[0] || existing;
    });
  },
  async deleteMany(filter = {}) {
    const params = [];
    const where = buildPredicate(filter, CONTENT_COLUMNS, params);
    const result = await query(`delete from public.content ${where ? `where ${where}` : ""}`, params);
    return { deletedCount: result.rowCount };
  },
  async create(data = {}) {
    const items = Array.isArray(data) ? data : [data];
    const created = [];

    for (const item of items) {
      const result = await query(
        `
          insert into public.content (key, payload)
          values ($1, $2)
          on conflict (key) do update set payload = excluded.payload, updated_at = timezone('utc', now())
          returning ${CONTENT_SELECT}
        `,
        [item.key, item.payload ?? null]
      );
      created.push(result.rows[0] || null);
    }

    return Array.isArray(data) ? created : created[0];
  },
};
