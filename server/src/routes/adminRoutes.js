import { Router } from "express";
import {
  bulkRemoveProducts,
  completeRental,
  cancelRental,
  confirmAdvance,
  confirmPaymentReceived,
  markProductReceived,
  getDashboard,
  listAdminRentals,
  recordHandoverInspection,
  recordRemainingPayment,
  recordReturnInspection,
  reportDamage,
  resolveDamage,
  reviewExtension
} from "../controllers/adminController.js";
import {
  listPayments,
  getPayment,
  verifyPayment,
  rejectPayment,
  cancelPayment
} from "../controllers/paymentController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// All admin routes require authenticated Admin or Master Admin
router.use(requireAuth, requireRole("admin", "master"));

router.get("/dashboard", getDashboard);
router.get("/rentals", listAdminRentals);
router.patch("/rentals/:id/payment-received", confirmPaymentReceived);
router.post("/rentals/:id/payment-received", confirmPaymentReceived);
router.patch("/rentals/:id/advance", confirmAdvance);
router.post("/rentals/:id/advance", confirmAdvance);
router.post("/rentals/:id/handover-inspection", recordHandoverInspection);
router.patch("/rentals/:id/remaining-payment", recordRemainingPayment);
router.patch("/rentals/:id/extension", reviewExtension);
router.post("/rentals/:id/return-inspection", recordReturnInspection);
router.post("/rentals/:id/damage", reportDamage);
router.patch("/rentals/:id/damage/resolve", resolveDamage);
router.patch("/rentals/:id/product-received", markProductReceived);
router.post("/rentals/:id/product-received", markProductReceived);
router.patch("/rentals/:id/complete", completeRental);
router.patch("/rentals/:id/cancel", cancelRental);
router.post("/rentals/:id/cancel", cancelRental);
router.delete("/products/bulk", bulkRemoveProducts);

// Payment Management & Manual Verification
router.get("/payments", listPayments);
router.get("/payments/:id", getPayment);
router.patch("/payments/:id/verify", verifyPayment);
router.post("/payments/:id/verify", verifyPayment);
router.patch("/payments/:id/reject", rejectPayment);
router.post("/payments/:id/reject", rejectPayment);
router.patch("/payments/:id/cancel", cancelPayment);
router.post("/payments/:id/cancel", cancelPayment);

export default router;
