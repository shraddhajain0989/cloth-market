import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/emailService.js";
import { ok, fail } from "../utils/respond.js";
import { signAccessToken, signRefreshToken } from "../utils/tokens.js";
import { env } from "../config/env.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject({ virtuals: true }) : { ...user };
  const { password, refreshTokens, resetPasswordToken, resetPasswordExpiry, __v, ...safe } = obj;
  return safe;
}

export async function signup(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return fail(res, 400, "Name, email and password are required.");
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(cleanEmail)) {
    return fail(res, 400, "Please provide a valid email address.");
  }

  if (password.length < 6) {
    return fail(res, 400, "Password must be at least 6 characters long.");
  }

  const exists = await User.findOne({ email: cleanEmail });
  if (exists) return fail(res, 409, "An account already exists for this email.");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    email: cleanEmail,
    password: passwordHash,
    role: "user",
    verified: false
  });

  // Verification email
  const verificationLink = `${env.clientUrl}/verify-email/${user.id}`;
  sendVerificationEmail(user.email, user.name, verificationLink).catch((err) =>
    console.error("Verification email failed:", err.message)
  );

  return ok(
    res,
    { user: sanitizeUser(user) },
    "Signup successful. Check your email to verify your account."
  );
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return fail(res, 400, "Email and password are required.");

  const cleanEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail });
  if (!user) return fail(res, 401, "Invalid email or password.");

  const passwordOk = await bcrypt.compare(password, user.password);
  if (!passwordOk) return fail(res, 401, "Invalid email or password.");

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await User.findByIdAndUpdate(user._id, { $push: { refreshTokens: refreshToken } });

  return ok(
    res,
    { user: sanitizeUser(user), accessToken, refreshToken },
    "Login successful."
  );
}

export async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return fail(res, 400, "Refresh token is required.");

  try {
    const payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
    const user = await User.findOne({ _id: payload.sub, refreshTokens: refreshToken });
    if (!user) return fail(res, 401, "Refresh token is invalid or revoked.");

    const newAccessToken = signAccessToken(user);
    return ok(res, { accessToken: newAccessToken, refreshToken }, "Session refreshed.");
  } catch {
    return fail(res, 401, "Invalid or expired refresh token.");
  }
}

export async function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await User.findOneAndUpdate(
      { refreshTokens: refreshToken },
      { $pull: { refreshTokens: refreshToken } }
    );
  }
  return ok(res, null, "Logged out successfully.");
}

export async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return fail(res, 400, "Email is required.");

  const cleanEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail });
  if (!user) {
    return ok(res, null, "If an account exists for this email, a reset link has been sent.");
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await User.findByIdAndUpdate(user._id, {
    resetPasswordToken: resetToken,
    resetPasswordExpiry: expiry
  });

  const resetLink = `${env.clientUrl}/reset-password?token=${resetToken}`;
  sendPasswordResetEmail(user.email, user.name, resetLink).catch((err) =>
    console.error("Password reset email failed:", err.message)
  );

  return ok(res, null, "If an account exists for this email, a reset link has been sent.");
}

export async function resetPassword(req, res) {
  const { resetToken, password } = req.body;
  if (!resetToken || !password) return fail(res, 400, "Reset token and new password are required.");
  if (password.length < 6) return fail(res, 400, "New password must be at least 6 characters long.");

  const user = await User.findOne({
    resetPasswordToken: resetToken,
    resetPasswordExpiry: { $gt: new Date() }
  });
  if (!user) return fail(res, 400, "Reset token is invalid or has expired.");

  const passwordHash = await bcrypt.hash(password, 10);
  await User.findByIdAndUpdate(user._id, {
    password: passwordHash,
    $unset: { resetPasswordToken: 1, resetPasswordExpiry: 1 }
  });

  return ok(res, null, "Password has been reset successfully.");
}

export async function verifyEmail(req, res) {
  const user = await User.findByIdAndUpdate(
    req.params.userId,
    { verified: true },
    { new: true }
  );
  if (!user) return fail(res, 404, "User not found.");
  return ok(res, { user: sanitizeUser(user) }, "Email verified.");
}

export async function googleLogin(_req, res) {
  return ok(
    res,
    { provider: "google", status: "stubbed" },
    "Google login endpoint ready."
  );
}
