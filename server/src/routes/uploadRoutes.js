import { Router } from "express";
import { uploadImage, upload } from "../controllers/uploadController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// POST /api/upload/image — admin/master only
router.post(
  "/image",
  requireAuth,
  requireRole("admin", "master"),
  upload.single("image"),
  uploadImage
);

export default router;
