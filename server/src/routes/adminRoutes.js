import { Router } from "express";
import {
  completeRental,
  confirmAdvance,
  getDashboard,
  listAdminRentals,
  recordHandoverInspection,
  recordRemainingPayment,
  recordReturnInspection,
  reportDamage,
  resolveDamage,
  reviewExtension
} from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// All admin routes require authenticated Admin or Master Admin
router.use(requireAuth, requireRole("admin", "master"));

router.get("/dashboard", getDashboard);
router.get("/rentals", listAdminRentals);
router.patch("/rentals/:id/advance", confirmAdvance);
router.post("/rentals/:id/handover-inspection", recordHandoverInspection);
router.patch("/rentals/:id/remaining-payment", recordRemainingPayment);
router.patch("/rentals/:id/extension", reviewExtension);
router.post("/rentals/:id/return-inspection", recordReturnInspection);
router.post("/rentals/:id/damage", reportDamage);
router.patch("/rentals/:id/damage/resolve", resolveDamage);
router.patch("/rentals/:id/complete", completeRental);

export default router;
