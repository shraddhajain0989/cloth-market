import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listCoupons,
  listProducts,
  updateProduct
} from "../controllers/productController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", listProducts);
router.get("/coupons", listCoupons);
router.get("/:productId", getProduct);
router.post("/", requireAuth, requireRole("admin", "master"), createProduct);
router.put("/:productId", requireAuth, requireRole("admin", "master"), updateProduct);
router.delete("/:productId", requireAuth, requireRole("admin", "master"), deleteProduct);

export default router;
