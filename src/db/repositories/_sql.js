function parseSelect(selectValue) {
  if (!selectValue || typeof selectValue !== "string") {
    return null;
  }

  const include = [];
  const exclude = [];

  for (const token of selectValue.split(/\s+/).filter(Boolean)) {
    if (token.startsWith("-")) {
      exclude.push(token.slice(1));
    } else {
      include.push(token);
    }
  }

  return { include, exclude };
}

function applyProjection(record, selectSpec) {
  if (!record || !selectSpec) {
    return record;
  }

  const source = { ...record };
  const selected = selectSpec.include.length > 0 ? {} : { ...source };

  if (selectSpec.include.length > 0) {
    for (const field of selectSpec.include) {
      if (field in source) {
        selected[field] = source[field];
      }
    }

    if ("_id" in source) {
      selected._id = source._id;
    }

    if ("id" in source) {
      selected.id = source.id;
    }
  }

  for (const field of selectSpec.exclude) {
    delete selected[field];
  }

  if (typeof source.save === "function") {
    Object.defineProperty(selected, "save", {
      value: source.save,
      enumerable: false,
    });
  }

  return selected;
}

function applySort(records, sortSpec) {
  if (!Array.isArray(records) || !sortSpec || typeof sortSpec !== "object") {
    return records;
  }

  const [[field, directionRaw]] = Object.entries(sortSpec);
  if (!field) {
    return records;
  }

  const direction = directionRaw === -1 || directionRaw === "desc" || directionRaw === "descending" ? -1 : 1;

  return [...records].sort((left, right) => {
    const leftValue = left?.[field];
    const rightValue = right?.[field];

    if (leftValue === rightValue) {
      return 0;
    }

    if (leftValue == null) {
      return 1 * direction;
    }

    if (rightValue == null) {
      return -1 * direction;
    }

    const leftTime = Date.parse(leftValue);
    const rightTime = Date.parse(rightValue);

    if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) {
      return (leftTime - rightTime) * direction;
    }

    return leftValue > rightValue ? direction : -direction;
  });
}

function buildPredicate(filter, columnMap, params) {
  if (!filter || typeof filter !== "object") {
    return "";
  }

  const parts = [];

  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined || value === "") {
      continue;
    }

    if (key === "$or" && Array.isArray(value)) {
      const orParts = value
        .map((subFilter) => buildPredicate(subFilter, columnMap, params))
        .filter(Boolean);

      if (orParts.length > 0) {
        parts.push(`(${orParts.map((clause) => `(${clause})`).join(" or ")})`);
      }

      continue;
    }

    const column = columnMap[key] || key;

    if (value === null) {
      parts.push(`${column} is null`);
      continue;
    }

    if (value instanceof RegExp) {
      params.push(value.source);
      parts.push(`position(lower($${params.length}::text) in lower(coalesce(${column}::text, ''))) > 0`);
      continue;
    }

    if (Array.isArray(value)) {
      params.push(value);
      parts.push(`${column} = any($${params.length})`);
      continue;
    }

    params.push(value);
    parts.push(`${column} = $${params.length}`);
  }

  return parts.join(" and ");
}

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value == null) {
    return [];
  }

  return [value];
}

export function createQuery(executor, populateHandler = null) {
  const state = {
    selectSpec: null,
    sortSpec: null,
    populateSpecs: [],
  };

  const queryObject = {
    select(value) {
      state.selectSpec = parseSelect(value);
      return queryObject;
    },
    sort(value) {
      state.sortSpec = value;
      return queryObject;
    },
    lean() {
      return queryObject;
    },
    populate(path, projection = null) {
      state.populateSpecs.push({ path, projection });
      return queryObject;
    },
    async execute() {
      let result = await executor();

      if (state.populateSpecs.length > 0 && populateHandler) {
        result = await populateHandler(result, state.populateSpecs);
      }

      if (Array.isArray(result)) {
        result = applySort(result, state.sortSpec).map((record) => applyProjection(record, state.selectSpec));
      } else {
        result = applyProjection(result, state.selectSpec);
      }

      return result;
    },
    then(resolve, reject) {
      return queryObject.execute().then(resolve, reject);
    },
    catch(reject) {
      return queryObject.execute().catch(reject);
    },
  };

  return queryObject;
}

export function attachSave(record, saveFn) {
  if (!record) {
    return record;
  }

  Object.defineProperty(record, "save", {
    value: async () => {
      const updated = await saveFn(record);
      if (updated && typeof updated === "object") {
        Object.assign(record, updated);
      }

      return record;
    },
    enumerable: false,
  });

  return record;
}

export function cleanObject(source) {
  const output = {};
  for (const [key, value] of Object.entries(source || {})) {
    if (value !== undefined) {
      output[key] = value;
    }
  }

  return output;
}

export function stripNullish(source) {
  const output = {};
  for (const [key, value] of Object.entries(source || {})) {
    if (value !== undefined && value !== null) {
      output[key] = value;
    }
  }

  return output;
}

export function toArray(value) {
  return ensureArray(value);
}

export { applyProjection, applySort, buildPredicate, parseSelect };
