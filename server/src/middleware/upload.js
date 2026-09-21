import multer from "multer";
import { cloudinary } from "../config/cloudinary.js";

// Store file in memory, then stream straight to Cloudinary (no temp disk writes)
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpg, png, webp, etc.) are allowed."));
    }
  }
});

/**
 * Uploads a buffer (from multer memory storage) to Cloudinary.
 * Returns the secure URL and public_id.
 */
export function uploadToCloudinary(buffer, folder = "cloth-market/products") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image", quality: "auto", fetch_format: "auto" },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}
