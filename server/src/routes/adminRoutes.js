import { Router } from "express";
import { getDashboard } from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/dashboard", requireAuth, requireRole("admin", "master"), getDashboard);

export default router;
