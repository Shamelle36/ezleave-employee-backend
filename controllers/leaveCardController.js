import { sql } from "../config/db.js"; // using your existing database connection

// ✅ Get leave card records for an employee
export const getLeaveCardByUser = async (req, res) => {
  try {
    const { user_id } = req.params; // Clerk's user_id

    const leaveCards = await sql`
      SELECT lc.*
      FROM leave_cards lc
      JOIN employee_list e ON lc.employee_id = e.id
      WHERE e.user_id = ${user_id}
      ORDER BY lc.id;
    `;

    if (!leaveCards.length) {
      return res.status(404).json({
        success: false,
        message: "No leave card records found for this employee.",
      });
    }

    res.status(200).json({
      success: true,
      data: leaveCards,
    });
  } catch (err) {
    console.error("❌ Error fetching leave card:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching leave card.",
      details: err.message,
    });
  }
};

