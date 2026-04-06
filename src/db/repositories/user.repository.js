import { randomUUID } from "crypto";
import { query } from "../../config/db.js";
import { attachSave, buildPredicate, cleanObject, createQuery, toArray } from "./_sql.js";

const USER_COLUMNS = {
  _id: "u.id",
  id: "u.id",
  username: "u.username",
  fullName: "u.full_name",
  email: "u.email",
  mobile: "u.mobile",
  avatar: "u.avatar",
  passwordHash: "u.password_hash",
  role: "u.role",
  refreshToken: "u.refresh_token",
  createdAt: "u.created_at",
  updatedAt: "u.updated_at",
};

const USER_SELECT = `
  u.id as "_id",
  u.id as id,
  u.username,
  u.full_name as "fullName",
  u.email,
  u.mobile,
  u.avatar,
  u.password_hash as "passwordHash",
  u.role,
  u.refresh_token as "refreshToken",
  u.created_at as "createdAt",
  u.updated_at as "updatedAt",
  coalesce(array_agg(uf.property_id) filter (where uf.property_id is not null), '{}'::text[]) as favorites
`;

const FAVORITE_PROPERTY_SELECT = `
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

function normalizeUserInput(data = {}) {
  const email = String(data.email || "").trim().toLowerCase();

  return cleanObject({
    id: data.id || data._id || randomUUID(),
    username: String(data.username || "").trim(),
    full_name: String(data.fullName || data.full_name || "").trim(),
    email,
    mobile: String(data.mobile || "").trim(),
    avatar: String(data.avatar || "").trim(),
    password_hash: String(data.passwordHash || data.password_hash || "").trim(),
    role: data.role === "admin" ? "admin" : "user",
    refresh_token: data.refreshToken ?? data.refresh_token ?? null,
  });
}

function normalizeFavoriteIds(value) {
  return toArray(value)
    .map((item) => String(item?._id || item?.id || item || "").trim())
    .filter(Boolean);
}

async function fetchUsers(filter = {}) {
  const params = [];
  const where = buildPredicate(filter, USER_COLUMNS, params);
  const sql = `
    select ${USER_SELECT}
    from public.users u
    left join public.user_favorites uf on uf.user_id = u.id
    ${where ? `where ${where}` : ""}
    group by u.id
  `;

  const { rows } = await query(sql, params);
  return rows.map((row) => ({
    ...row,
    favorites: normalizeFavoriteIds(row.favorites),
  }));
}

async function fetchUserById(id) {
  const users = await fetchUsers({ _id: id });
  return users[0] || null;
}

async function fetchFavoriteProperties(propertyIds) {
  const ids = normalizeFavoriteIds(propertyIds);
  if (ids.length === 0) {
    return [];
  }

  const { rows } = await query(
    `
      select ${FAVORITE_PROPERTY_SELECT}
      from public.properties p
      where p.id = any($1)
    `,
    [ids]
  );

  const propertyMap = new Map(rows.map((row) => [row._id, row]));
  return ids.map((id) => propertyMap.get(id)).filter(Boolean);
}

async function populateUsers(records, populateSpecs) {
  let result = Array.isArray(records) ? [...records] : records ? { ...records } : records;

  for (const spec of populateSpecs) {
    if (spec.path !== "favorites") {
      continue;
    }

    const list = Array.isArray(result) ? result : [result];
    const favoriteIds = [...new Set(list.flatMap((item) => normalizeFavoriteIds(item?.favorites)))];
    if (favoriteIds.length === 0) {
      continue;
    }

    const properties = await fetchFavoriteProperties(favoriteIds);
    const propertyMap = new Map(properties.map((property) => [property._id, property]));

    result = list.map((item) => {
      if (!item) {
        return item;
      }

      return {
        ...item,
        favorites: normalizeFavoriteIds(item.favorites).map((propertyId) => propertyMap.get(propertyId)).filter(Boolean),
      };
    });
  }

  return Array.isArray(records) ? result : result[0] || null;
}

async function syncFavorites(userId, favorites) {
  const nextIds = normalizeFavoriteIds(favorites);
  const currentRows = await query(`select property_id from public.user_favorites where user_id = $1`, [userId]);
  const currentIds = currentRows.rows.map((row) => row.property_id);

  const toRemove = currentIds.filter((id) => !nextIds.includes(id));
  const toAdd = nextIds.filter((id) => !currentIds.includes(id));

  if (toRemove.length > 0) {
    await query(`delete from public.user_favorites where user_id = $1 and property_id = any($2)`, [userId, toRemove]);
  }

  for (const propertyId of toAdd) {
    await query(
      `insert into public.user_favorites (user_id, property_id) values ($1, $2) on conflict do nothing`,
      [userId, propertyId]
    );
  }

  return nextIds;
}

async function saveUserRecord(record) {
  const payload = normalizeUserInput(record);
  const result = await query(
    `
      update public.users
      set username = $2,
          full_name = $3,
          email = $4,
          mobile = $5,
          avatar = $6,
          password_hash = $7,
          role = $8,
          refresh_token = $9,
          updated_at = timezone('utc', now())
      where id = $1
      returning
        id as "_id",
        id,
        username,
        full_name as "fullName",
        email,
        mobile,
        avatar,
        password_hash as "passwordHash",
        role,
        refresh_token as "refreshToken",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [
      payload.id,
      payload.username,
      payload.full_name,
      payload.email,
      payload.mobile,
      payload.avatar,
      payload.password_hash,
      payload.role,
      payload.refresh_token,
    ]
  );

  const updated = result.rows[0] || null;
  if (!updated) {
    return null;
  }

  updated.favorites = await syncFavorites(payload.id, record.favorites);
  return updated;
}

function hydrateUser(record) {
  if (!record) {
    return null;
  }

  return attachSave({ ...record }, saveUserRecord);
}

async function deleteUsers(filter = {}) {
  const params = [];
  const where = buildPredicate(filter, USER_COLUMNS, params);

  if (!where) {
    await query(`delete from public.user_favorites`);
    const result = await query(`delete from public.users`);
    return { deletedCount: result.rowCount };
  }

  const ids = await query(`select id from public.users u where ${where}`, params);
  if (ids.rows.length > 0) {
    await query(`delete from public.user_favorites where user_id = any($1)`, [ids.rows.map((row) => row.id)]);
  }

  const result = await query(`delete from public.users u where ${where}`, params);
  return { deletedCount: result.rowCount };
}

async function updateUsers(filter = {}, update = {}) {
  if (update.$pull && update.$pull.favorites !== undefined) {
    const propertyIds = normalizeFavoriteIds(update.$pull.favorites);
    if (propertyIds.length === 0) {
      return { matchedCount: 0, modifiedCount: 0 };
    }

    const result = await query(`delete from public.user_favorites where property_id = any($1)`, [propertyIds]);
    return { matchedCount: result.rowCount, modifiedCount: result.rowCount };
  }

  const params = [];
  const where = buildPredicate(filter, USER_COLUMNS, params);
  const set = [];

  function addField(fieldName, value) {
    if (value === undefined) {
      return;
    }

    params.push(value);
    set.push(`${fieldName} = $${params.length}`);
  }

  if (update.$set) {
    const input = update.$set;
    addField("username", input.username);
    addField("full_name", input.fullName ?? input.full_name);
    addField("email", input.email !== undefined ? String(input.email).toLowerCase() : undefined);
    addField("mobile", input.mobile);
    addField("avatar", input.avatar);
    addField("password_hash", input.passwordHash ?? input.password_hash);
    addField("role", input.role);
    addField("refresh_token", input.refreshToken ?? input.refresh_token);
  }

  if (set.length === 0) {
    return { matchedCount: 0, modifiedCount: 0 };
  }

  const result = await query(
    `update public.users u set ${set.join(", ")}, updated_at = timezone('utc', now()) ${where ? `where ${where}` : ""}`,
    params
  );

  return { matchedCount: result.rowCount, modifiedCount: result.rowCount };
}

export const User = {
  find(filter = {}) {
    return createQuery(async () => (await fetchUsers(filter)).map((record) => hydrateUser(record)), populateUsers);
  },
  findOne(filter = {}) {
    return createQuery(async () => hydrateUser((await fetchUsers(filter))[0] || null), populateUsers);
  },
  findById(id) {
    return createQuery(async () => hydrateUser(await fetchUserById(id)), populateUsers);
  },
  async create(data = {}) {
    const payload = normalizeUserInput(data);
    const result = await query(
      `
        insert into public.users (
          id, username, full_name, email, mobile, avatar, password_hash, role, refresh_token
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        returning
          id as "_id",
          id,
          username,
          full_name as "fullName",
          email,
          mobile,
          avatar,
          password_hash as "passwordHash",
          role,
          refresh_token as "refreshToken",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [
        payload.id,
        payload.username,
        payload.full_name,
        payload.email,
        payload.mobile,
        payload.avatar,
        payload.password_hash,
        payload.role,
        payload.refresh_token,
      ]
    );

    const created = hydrateUser(result.rows[0] || null);
    if (created && data.favorites) {
      created.favorites = await syncFavorites(created._id, data.favorites);
    } else if (created) {
      created.favorites = [];
    }

    return created;
  },
  updateOne(filter = {}, update = {}) {
    return updateUsers(filter, update);
  },
  updateMany(filter = {}, update = {}) {
    return updateUsers(filter, update);
  },
  deleteMany(filter = {}) {
    return deleteUsers(filter);
  },
  async findByIdAndDelete(id) {
    await query(`delete from public.user_favorites where user_id = $1`, [id]);
    const result = await query(`delete from public.users where id = $1 returning id as "_id"`, [id]);
    return result.rows[0] ? { _id: result.rows[0]._id } : null;
  },
  async updateRefreshToken(id, refreshToken) {
    const result = await query(
      `
        update public.users
        set refresh_token = $2,
            updated_at = timezone('utc', now())
        where id = $1
        returning
          id as "_id",
          id,
          username,
          full_name as "fullName",
          email,
          mobile,
          avatar,
          password_hash as "passwordHash",
          role,
          refresh_token as "refreshToken",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `,
      [id, refreshToken]
    );

    return hydrateUser(result.rows[0] || null);
  },
  clearRefreshTokenByToken(refreshToken) {
    return query(`update public.users set refresh_token = null, updated_at = timezone('utc', now()) where refresh_token = $1`, [refreshToken]);
  },
  async getFavorites(userId) {
    const user = await fetchUserById(userId);
    return fetchFavoriteProperties(user?.favorites || []);
  },
  async save(user) {
    return saveUserRecord(user);
  },
};
