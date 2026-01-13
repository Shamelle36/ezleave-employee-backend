// routes/leaveApplicationRoute.js
import express from "express";
import { applyLeave, getLeaveHistory, checkLeaveBalance } from "../controllers/leaveApplicationController.js";

const router = express.Router();

// ✅ Health check (so browser GET works)
router.get("/", (req, res) => {
  res.json({ success: true, message: "Leave Application API is alive 🚀" });
});

// ✅ Apply for leave
router.post("/", applyLeave);
router.get("/:userId", getLeaveHistory);
router.post("/check-balance", checkLeaveBalance);

export default router;
