import { Router } from "express";
import {
  acknowledgeHandover,
  checkAvailability,
  createRental,
  getRental,
  listRentals,
  requestExtension
} from "../controllers/rentalController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/check-availability", checkAvailability);
router.get("/", requireAuth, listRentals);
router.get("/:id", requireAuth, getRental);
router.post("/", requireAuth, createRental);
router.post("/:id/acknowledge-handover", requireAuth, acknowledgeHandover);
router.post("/:id/request-extension", requireAuth, requestExtension);

export default router;
