import fs from "fs";
import path from "path";
import crypto from "crypto";
import { upload, uploadToCloudinary } from "../middleware/upload.js";
import { env } from "../config/env.js";
import { ok, fail } from "../utils/respond.js";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

async function processFile(file, req, folder = "cloth-market/products") {
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    throw new Error(`Invalid image format (${file.mimetype}). Only JPG, JPEG, PNG, and WEBP are supported.`);
  }

  const isProduction = env.nodeEnv === "production";
  const hasCloudinary = Boolean(
    env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret
  );

  // In production, Cloudinary configuration is strictly mandatory.
  if (isProduction && !hasCloudinary) {
    throw new Error("Cloudinary configuration missing in production environment. Upload rejected to prevent ephemeral data loss.");
  }

  // 1. Cloudinary upload if configured
  if (hasCloudinary) {
    try {
      const { url, publicId } = await uploadToCloudinary(file.buffer, folder);
      return { url, publicId };
    } catch (err) {
      if (isProduction) {
        throw new Error(`Cloudinary upload failed in production: ${err.message}`);
      }
      console.error("Cloudinary upload failed, falling back to local storage:", err.message);
    }
  }

  // 2. Local disk storage fallback (ONLY permitted in development / testing)
  if (isProduction) {
    throw new Error("Local filesystem storage is prohibited in production environment.");
  }

  const uploadDir = path.resolve("public/uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const ext = file.mimetype.split("/")[1] || "jpg";
  const filename = `cloth-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
  const filePath = path.join(uploadDir, filename);

  fs.writeFileSync(filePath, file.buffer);
  const host = req.get("host") || "localhost:5002";
  const protocol = req.protocol || "http";
  const url = `${protocol}://${host}/uploads/${filename}`;
  return { url, publicId: filename };
}

export async function uploadImage(req, res) {
  if (!req.file) return fail(res, 400, "No image file provided.");

  try {
    const folder = req.body?.folder === "payment-qr"
      ? "cloth-market/payment-qr"
      : req.body?.folder === "inspections"
      ? "cloth-market/inspections"
      : "cloth-market/products";

    const result = await processFile(req.file, req, folder);
    return ok(res, result, "Image uploaded successfully.");
  } catch (err) {
    const status = err.message.includes("Invalid image format") ? 400 : 500;
    return fail(res, status, err.message);
  }
}

export async function uploadImages(req, res) {
  const files = req.files;
  if (!files || !Array.isArray(files) || files.length === 0) {
    return fail(res, 400, "No image files provided.");
  }

  if (files.length > 5) {
    return fail(res, 400, "Maximum of 5 images allowed per upload.");
  }

  try {
    const folder = req.body?.folder === "inspections" ? "cloth-market/inspections" : "cloth-market/products";
    const uploaded = [];

    for (const file of files) {
      const result = await processFile(file, req, folder);
      uploaded.push(result);
    }

    return ok(res, uploaded, `${uploaded.length} image(s) uploaded successfully.`);
  } catch (err) {
    const status = err.message.includes("Invalid image format") ? 400 : 500;
    return fail(res, status, err.message);
  }
}

export { upload };
