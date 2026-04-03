import { ApiError } from "../utils/apiError.js";

export const validate = (schema, source = "body") => (req, _res, next) => {
  const parseResult = schema.safeParse(req[source]);

  if (!parseResult.success) {
    return next(
      new ApiError(
        422,
        "Validation failed",
        parseResult.error.issues.map((issue) => issue.message)
      )
    );
  }

  req[source] = parseResult.data;
  next();
};
