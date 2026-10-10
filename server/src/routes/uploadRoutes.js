import { Router } from "express";
import { uploadImage, uploadImages, upload } from "../controllers/uploadController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Single image upload — admin/master only
router.post(
  "/image",
  requireAuth,
  requireRole("admin", "master"),
  upload.single("image"),
  uploadImage
);

// Multiple image upload (up to 5 images) — admin/master only
router.post(
  "/images",
  requireAuth,
  requireRole("admin", "master"),
  upload.array("images", 5),
  uploadImages
);

// QR image upload — admin/master only
router.post(
  "/qr",
  requireAuth,
  requireRole("admin", "master"),
  upload.single("image"),
  (req, _res, next) => {
    req.body = req.body || {};
    req.body.folder = "payment-qr";
    next();
  },
  uploadImage
);

export default router;
