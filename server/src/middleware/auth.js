import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { fail } from "../utils/respond.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return fail(res, 401, "Authentication required.");

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    if (!user) return fail(res, 401, "User not found.");
    if (user.status === "disabled") {
      return fail(res, 403, "Your account has been disabled. Contact Master Admin.");
    }
    req.user = user;
    next();
  } catch {
    return fail(res, 401, "Invalid or expired token.");
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 401, "Authentication required.");
    }
    const userRole = req.user.role;
    const hasRole = roles.includes(userRole) || (roles.includes("admin") && userRole === "master");
    if (!hasRole) {
      return fail(res, 403, "You do not have permission for this action.");
    }
    next();
  };
}
