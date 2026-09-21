import { Router } from "express";
import {
  addToCart,
  createReturnRequest,
  getCart,
  listOrders,
  placeOrder,
  removeCartItem,
  updateCartItem
} from "../controllers/orderController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/cart", requireAuth, getCart);
router.post("/cart", requireAuth, addToCart);
router.put("/cart/:productId", requireAuth, updateCartItem);
router.delete("/cart/:productId", requireAuth, removeCartItem);
router.post("/", requireAuth, placeOrder);
router.get("/", requireAuth, listOrders);
router.post("/returns", requireAuth, createReturnRequest);

export default router;
