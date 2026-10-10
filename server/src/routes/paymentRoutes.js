import { Router } from "express";
import {
  listPayments,
  getPayment,
  createPayment,
  verifyPayment,
  rejectPayment,
  cancelPayment
} from "../controllers/paymentController.js";
import { requireAuth, requireRole, optionalAuth } from "../middleware/auth.js";

const router = Router();

// Create payment record / WhatsApp enquiry tracking
router.post("/", optionalAuth, createPayment);

// Admin / Master protected routes
router.get("/", requireAuth, requireRole("admin", "master"), listPayments);
router.get("/:id", requireAuth, requireRole("admin", "master"), getPayment);
router.patch("/:id/verify", requireAuth, requireRole("admin", "master"), verifyPayment);
router.post("/:id/verify", requireAuth, requireRole("admin", "master"), verifyPayment);
router.patch("/:id/reject", requireAuth, requireRole("admin", "master"), rejectPayment);
router.post("/:id/reject", requireAuth, requireRole("admin", "master"), rejectPayment);
router.patch("/:id/cancel", requireAuth, requireRole("admin", "master"), cancelPayment);
router.post("/:id/cancel", requireAuth, requireRole("admin", "master"), cancelPayment);

export default router;
