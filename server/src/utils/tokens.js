import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    env.jwtSecret,
    { expiresIn: "20m" }
  );
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, env.jwtRefreshSecret, { expiresIn: "7d" });
}
