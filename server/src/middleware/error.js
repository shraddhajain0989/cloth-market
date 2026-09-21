import { fail } from "../utils/respond.js";

export function errorHandler(error, _req, res, _next) {
  console.error(error);
  return fail(res, error.status || 500, error.message || "Something went wrong.");
}
