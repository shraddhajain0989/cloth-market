import { Router } from "express";
import {
  createAdmin,
  deleteAdmin,
  getAuditLogs,
  getMasterAnalytics,
  listAdmins,
  setAdminStatus
} from "../controllers/masterAdminController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Master Admin routes require authenticated Master Admin
router.use(requireAuth, requireRole("master"));

router.get("/analytics", getMasterAnalytics);
router.get("/admins", listAdmins);
router.post("/admins", createAdmin);
router.patch("/admins/:id/status", setAdminStatus);
router.delete("/admins/:id", deleteAdmin);
router.get("/logs", getAuditLogs);

export default router;
