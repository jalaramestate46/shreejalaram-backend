import { query } from "../../config/db.js";
import { buildPredicate, createQuery, parseJsonField, stringifyJson } from "./_sql.js";
import { randomUUID } from "crypto";

const PROPERTY_COLUMNS = {
  _id: "p.id",
  id: "p.id",
  title: "p.title",
  description: "p.description",
  transactionType: "p.transaction_type",
  propertyType: "p.property_type",
  category: "p.category",
  subCategory: "p.sub_category",
  location: "p.location",
  address: "p.address",
  price: "p.price",
  sqt: "p.sqt",
  bedrooms: "p.bedrooms",
  bathrooms: "p.bathrooms",
  agent: "p.agent_id",
  createdAt: "p.created_at",
  updatedAt: "p.updated_at",
};

const PROPERTY_SELECT = `
  p.id as "_id",
  p.id as id,
  p.title,
  p.description,
  p.transaction_type as "transactionType",
  p.property_type as "propertyType",
  p.category,
  p.sub_category as "subCategory",
  p.location,
  p.address,
  p.price,
  p.sqt,
  p.bedrooms,
  p.bathrooms,
  p.images,
  p.agent_id as agent,
  p.created_at as "createdAt",
  p.updated_at as "updatedAt"
`;

const USER_SELECT = `
  u.id as "_id",
  u.id as id,
  u.username,
  u.full_name as "fullName",
  u.email,
  u.mobile,
  u.avatar,
  u.role,
  u.created_at as "createdAt",
  u.updated_at as "updatedAt"
`;

function normalizePropertyInput(data = {}) {
  return {
    id: data.id || data._id || randomUUID(),
    title: String(data.title || "").trim(),
    description: String(data.description || "").trim(),
    transaction_type: data.transactionType || data.transaction_type,
    property_type: data.propertyType || data.property_type,
    category: String(data.category || "").trim(),
    sub_category: String(data.subCategory || data.sub_category || "").trim(),
    location: String(data.location || "").trim(),
    address: String(data.address || "").trim(),
    price: Number(data.price || 0),
    sqt: Number(data.sqt || 0),
    bedrooms: data.bedrooms === undefined || data.bedrooms === "" || data.bedrooms === null ? null : Number(data.bedrooms),
    bathrooms: data.bathrooms === undefined || data.bathrooms === "" || data.bathrooms === null ? null : Number(data.bathrooms),
    images: Array.isArray(data.images) ? data.images : [],
    agent_id: data.agent || data.agent_id || null,
  };
}

function mapProperty(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    images: parseJsonField(row.images, []),
    agent: row.agent ?? null,
  };
}

async function fetchProperties(filter = {}) {
  const params = [];
  const where = buildPredicate(filter, PROPERTY_COLUMNS, params);
  const { rows } = await query(`select ${PROPERTY_SELECT} from properties p ${where ? `where ${where}` : ""}`, params);
  return rows.map(mapProperty);
}

async function fetchPropertyById(id) {
  const properties = await fetchProperties({ _id: id });
  return properties[0] || null;
}

function applyProjection(record, projection) {
  if (!record || !projection) {
    return record;
  }

  const selected = {};
  const fields = String(projection)
    .split(/\s+/)
    .filter(Boolean)
    .filter((field) => !field.startsWith("-"));

  if (fields.length === 0) {
    return record;
  }

  for (const field of fields) {
    if (field in record) {
      selected[field] = record[field];
    }
  }

  if (record._id !== undefined) {
    selected._id = record._id;
  }

  return selected;
}

async function populateProperties(records, populateSpecs) {
  let result = Array.isArray(records) ? [...records] : records ? { ...records } : records;

  for (const spec of populateSpecs) {
    if (spec.path !== "agent") {
      continue;
    }

    const list = Array.isArray(result) ? result : [result];
    const agentIds = [...new Set(list.map((item) => item?.agent).filter(Boolean))];
    if (agentIds.length === 0) {
      continue;
    }

    const agentRows = await query(
      `
        select ${USER_SELECT}
        from users u
        where u.id in (${agentIds.map(() => "?").join(", ")})
      `,
      agentIds
    );

    const agentMap = new Map(agentRows.rows.map((row) => [row._id, row]));
    result = list.map((item) => {
      if (!item) {
        return item;
      }

      const populated = { ...item, agent: agentMap.get(item.agent) || null };
      if (spec.projection) {
        populated.agent = applyProjection(populated.agent, spec.projection);
      }

      return populated;
    });
  }

  return Array.isArray(records) ? result : result[0] || null;
}

async function deleteProperties(filter = {}) {
  const params = [];
  const where = buildPredicate(filter, PROPERTY_COLUMNS, params);
  const result = await query(`delete from properties ${where ? `where ${where}` : ""}`, params);
  return { deletedCount: result.rowCount };
}

async function updateProperty(id, payload = {}) {
  const data = normalizePropertyInput(payload);
  const result = await query(
    `
      update properties
      set title = ?,
          description = ?,
          transaction_type = ?,
          property_type = ?,
          category = ?,
          sub_category = ?,
          location = ?,
          address = ?,
          price = ?,
          sqt = ?,
          bedrooms = ?,
          bathrooms = ?,
          images = ?,
          agent_id = ?,
          updated_at = utc_timestamp()
      where id = ?
    `,
    [
      data.title,
      data.description,
      data.transaction_type,
      data.property_type,
      data.category,
      data.sub_category,
      data.location,
      data.address,
      data.price,
      data.sqt,
      data.bedrooms,
      data.bathrooms,
      stringifyJson(data.images, []),
      data.agent_id,
      id,
    ]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return fetchPropertyById(id);
}

export const Property = {
  find(filter = {}) {
    return createQuery(async () => fetchProperties(filter), populateProperties);
  },
  findOne(filter = {}) {
    return createQuery(async () => {
      const rows = await fetchProperties(filter);
      return rows[0] || null;
    }, populateProperties);
  },
  findById(id) {
    return createQuery(async () => fetchPropertyById(id), populateProperties);
  },
  async create(data = {}) {
    const payload = normalizePropertyInput(data);
    await query(
      `
        insert into properties (
          id, title, description, transaction_type, property_type, category, sub_category,
          location, address, price, sqt, bedrooms, bathrooms, images, agent_id
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.id,
        payload.title,
        payload.description,
        payload.transaction_type,
        payload.property_type,
        payload.category,
        payload.sub_category,
        payload.location,
        payload.address,
        payload.price,
        payload.sqt,
        payload.bedrooms,
        payload.bathrooms,
        stringifyJson(payload.images, []),
        payload.agent_id,
      ]
    );

    return fetchPropertyById(payload.id);
  },
  findByIdAndUpdate(id, payload = {}) {
    return updateProperty(id, payload);
  },
  async findByIdAndDelete(id) {
    const existing = await fetchPropertyById(id);
    if (!existing) {
      return null;
    }

    await query(`delete from properties where id = ?`, [id]);
    return { _id: existing._id };
  },
  deleteMany(filter = {}) {
    return deleteProperties(filter);
  },
};
