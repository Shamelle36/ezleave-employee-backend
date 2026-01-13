import { sql } from "../config/db.js";

// =====================================
// GET Active Terms & Conditions (Employee App)
// =====================================
export const getEmployeeTerms = async (req, res) => {
  try {
    const result = await sql`
      SELECT *
      FROM terms_conditions
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (result.length === 0) {
      return res.status(404).json({ message: "No active Terms & Conditions found." });
    }

    res.json({
      message: "Active Terms & Conditions retrieved successfully.",
      data: result[0],
    });
  } catch (error) {
    console.error("Error fetching employee terms:", error);
    res.status(500).json({ message: "Server error" });
  }
};
