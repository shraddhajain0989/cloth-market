import fs from "fs";
import path from "path";
import crypto from "crypto";
import { upload, uploadToCloudinary } from "../middleware/upload.js";
import { env } from "../config/env.js";
import { ok, fail } from "../utils/respond.js";

export async function uploadImage(req, res) {
  if (!req.file) return fail(res, 400, "No image file provided.");

  // Validate allowed extensions and MIME types
  const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (!allowedMime.includes(req.file.mimetype)) {
    return fail(res, 400, "Invalid image format. Only JPG, JPEG, PNG, and WEBP are supported.");
  }

  const isProduction = env.nodeEnv === "production";
  const hasCloudinary = Boolean(
    env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret
  );

  // In production, Cloudinary configuration is strictly mandatory.
  // Local disk writes are prohibited because Render containers have ephemeral filesystems.
  if (isProduction && !hasCloudinary) {
    return fail(
      res,
      500,
      "Cloudinary configuration missing in production environment. Upload rejected to prevent ephemeral data loss."
    );
  }

  // 1. Cloudinary upload if configured
  if (hasCloudinary) {
    try {
      const folder = req.body?.folder === "inspections" ? "cloth-market/inspections" : "cloth-market/products";
      const { url, publicId } = await uploadToCloudinary(req.file.buffer, folder);
      return ok(res, { url, publicId }, "Image uploaded successfully to Cloudinary.");
    } catch (err) {
      if (isProduction) {
        return fail(res, 502, `Cloudinary upload failed in production: ${err.message}`);
      }
      console.error("Cloudinary upload failed, falling back to local:", err.message);
    }
  }

  // 2. Local disk storage fallback (ONLY permitted in development / testing)
  if (isProduction) {
    return fail(res, 500, "Local filesystem storage is prohibited in production environment.");
  }

  try {
    const uploadDir = path.resolve("public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = req.file.mimetype.split("/")[1] || "jpg";
    const filename = `cloth-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, req.file.buffer);
    const url = `/uploads/${filename}`;
    return ok(res, { url, publicId: filename }, "Image uploaded successfully (local development).");
  } catch (err) {
    return fail(res, 500, `Failed to store image: ${err.message}`);
  }
}

export { upload };
