import { upload, uploadToCloudinary } from "../middleware/upload.js";
import { env } from "../config/env.js";
import { ok, fail } from "../utils/respond.js";

export async function uploadImage(req, res) {
  if (!env.cloudinaryCloudName) {
    return fail(res, 503, "Image upload is not configured yet. Add Cloudinary credentials to .env.");
  }
  if (!req.file) return fail(res, 400, "No image file provided.");

  const { url, publicId } = await uploadToCloudinary(req.file.buffer);
  return ok(res, { url, publicId }, "Image uploaded successfully.");
}

export { upload };
