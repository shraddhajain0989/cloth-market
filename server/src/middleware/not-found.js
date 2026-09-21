import { fail } from "../utils/respond.js";

export function notFound(_req, res) {
  return fail(res, 404, "Route not found.");
}
