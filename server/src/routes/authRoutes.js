import { Router } from "express";
import {
  forgotPassword,
  googleLogin,
  login,
  logout,
  refresh,
  resetPassword,
  signup,
  verifyEmail
} from "../controllers/authController.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/google", googleLogin);
router.post("/verify/:userId", verifyEmail);

export default router;
