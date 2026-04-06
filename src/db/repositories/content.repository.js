import { query } from "../../config/db.js";
import { buildPredicate, createQuery, parseJsonField, stringifyJson } from "./_sql.js";

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
  const { rows } = await query(`select ${CONTENT_SELECT} from content c ${where ? `where ${where}` : ""}`, params);
  return rows.map((row) => ({
    ...row,
    payload: parseJsonField(row.payload, {}),
  }));
}

function extractPayload(update = {}) {
  if (Object.prototype.hasOwnProperty.call(update, "payload")) {
    return update.payload;
  }

  if (update.$set && Object.prototype.hasOwnProperty.call(update.$set, "payload")) {
    return update.$set.payload;
  }

  if (update.$setOnInsert && Object.prototype.hasOwnProperty.call(update.$setOnInsert, "payload")) {
    return update.$setOnInsert.payload;
  }

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

      if (!existing && !options.upsert) {
        return null;
      }

      if (!existing) {
        const key = filter.key;
        if (!key) {
          return null;
        }

        const inserted = await query(
          `
            insert into content (\`key\`, payload)
            values (?, ?)
            on duplicate key update payload = values(payload), updated_at = utc_timestamp()
          `,
          [key, stringifyJson(payload, null)]
        );

        const rows = await fetchContent({ key });
        return rows[0] || null;
      }

      if (payload === undefined) {
        return existing;
      }

      const updated = await query(
        `
          update content
          set payload = ?,
              updated_at = utc_timestamp()
          where \`key\` = ?
        `,
        [stringifyJson(payload, null), existing.key]
      );

      if (updated.rowCount === 0) {
        return existing;
      }

      const rows = await fetchContent({ key: existing.key });
      return rows[0] || existing;
    });
  },
  async deleteMany(filter = {}) {
    const params = [];
    const where = buildPredicate(filter, CONTENT_COLUMNS, params);
    const result = await query(`delete from content ${where ? `where ${where}` : ""}`, params);
    return { deletedCount: result.rowCount };
  },
  async create(data = {}) {
    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      await query(
        `insert into content (\`key\`, payload) values (?, ?) on duplicate key update payload = values(payload), updated_at = utc_timestamp()`,
        [item.key, stringifyJson(item.payload, {})]
      );
    }

    if (Array.isArray(data)) {
      return fetchContent({});
    }

    const rows = await fetchContent({ key: data.key });
    return rows[0] || null;
  },
};
