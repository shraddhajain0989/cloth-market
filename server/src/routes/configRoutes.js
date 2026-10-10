import { Router } from "express";
import {
  getPublicConfig,
  getAdminConfig,
  updateAdminConfig
} from "../controllers/configController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Public endpoint for customers to get business WhatsApp number and QR
router.get("/public", getPublicConfig);

// Admin endpoints
router.get("/admin", requireAuth, requireRole("admin", "master"), getAdminConfig);
router.put("/admin", requireAuth, requireRole("admin", "master"), updateAdminConfig);

export default router;
