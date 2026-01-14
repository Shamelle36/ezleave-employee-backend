// routes/leaveApplicationRoute.js
import express from "express";
import { applyLeave, getLeaveHistory, checkLeaveBalance } from "../controllers/leaveApplicationController.js";
import { sql } from "../config/db.js"; // Add this import

const router = express.Router();

// ✅ Health check (so browser GET works)
router.get("/", (req, res) => {
  res.json({ success: true, message: "Leave Application API is alive 🚀" });
});

// ✅ Apply for leave
router.post("/", applyLeave);
router.get("/:userId", getLeaveHistory);
router.post("/check-balance", checkLeaveBalance);

// ✅ NEW: Fetch all local holidays
router.get("/holidays/all", async (req, res) => {
  try {
    const holidays = await sql`
      SELECT * FROM local_holidays
      ORDER BY date;
    `;
    
    res.json({
      success: true,
      count: holidays.length,
      holidays
    });
  } catch (error) {
    console.error("Error fetching local holidays:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch local holidays"
    });
  }
});

// ✅ NEW: Fetch holidays by year
router.get("/holidays/year/:year", async (req, res) => {
  try {
    const { year } = req.params;
    
    const holidays = await sql`
      SELECT * FROM local_holidays
      WHERE EXTRACT(YEAR FROM date) = ${parseInt(year)}
         OR is_recurring = true
      ORDER BY date;
    `;
    
    res.json({
      success: true,
      year,
      count: holidays.length,
      holidays
    });
  } catch (error) {
    console.error("Error fetching local holidays by year:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch local holidays"
    });
  }
});

export default router;