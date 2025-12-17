import express from "express";
const router = express.Router();
import { authMiddleware } from "../middleware/authMiddleware.js";
import { multerMiddleware } from "../config/cloudinaryConfig.js";
import {
  deleteStatus,
  getStatus,
  viewStatus,
  createStatus,
} from "../controllers/statusController.js";

// portected routes
router.post("/create", authMiddleware, multerMiddleware, createStatus);
router.get("/get", authMiddleware, getStatus);
router.put("/:statusId/view", authMiddleware, viewStatus);
router.delete("/:statusId", authMiddleware, deleteStatus);
export default router;
