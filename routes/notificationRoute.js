import express from "express";
import {
  getNotifications,
  createNotification,
  markAsRead,
  testPushDirect
} from "../controllers/notificationController.js";

const router = express.Router();

// 📌 Routes
router.get("/:userId", getNotifications);     // GET all notifications for user
router.post("/", createNotification);         // POST new notification
router.patch("/:id/read", markAsRead);        // PATCH mark as read
router.post('/test-push', testPushDirect);

export default router;
