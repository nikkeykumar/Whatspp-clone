import express from "express";
const router = express.Router();
import { authMiddleware } from "../middleware/authMiddleware.js";
import { multerMiddleware } from "../config/cloudinaryConfig.js";
import {
  deleteMessage,
  getConvercation,
  getMessages,
  markAsRead,
  sendMessage,
} from "../controllers/chatController.js";

// portected routes
router.post("/send-message", authMiddleware, multerMiddleware, sendMessage);
router.get("/conversation", authMiddleware, getConvercation);
router.get("/messages/:convercationId", authMiddleware, getMessages);
router.put("/message/read", authMiddleware, markAsRead);
router.delete("/messages/:messageId", authMiddleware, deleteMessage);
export default router;
