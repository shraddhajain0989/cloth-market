import { Router } from "express";
import {
  addAddress,
  deleteUser,
  getProfile,
  getUsers,
  updateProfile,
  updateWishlist
} from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/me", requireAuth, getProfile);
router.put("/me", requireAuth, updateProfile);
router.post("/me/addresses", requireAuth, addAddress);
router.post("/me/wishlist", requireAuth, updateWishlist);
router.get("/", requireAuth, requireRole("admin", "master"), getUsers);
router.delete("/:userId", requireAuth, requireRole("master"), deleteUser);

export default router;
