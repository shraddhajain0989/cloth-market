import { Router } from "express";
import { createRental, createSubscriptionPlan, listRentals } from "../controllers/rentalController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, listRentals);
router.post("/", requireAuth, createRental);
router.get("/plans", requireAuth, createSubscriptionPlan);

export default router;
