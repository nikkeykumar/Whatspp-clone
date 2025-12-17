import express from "express";
const router = express.Router();
import {
  checkAuthenticated,
  getAllUsers,
  logout,
  sendOtp,
  updateProfile,
  verifyOtp,
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { multerMiddleware } from "../config/cloudinaryConfig.js";

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/logout", logout);

// portected routes
router.put("/update-porfile", authMiddleware, multerMiddleware, updateProfile);
router.get("/check-auth", authMiddleware, checkAuthenticated);
router.get("/users", authMiddleware, getAllUsers);
export default router;
 