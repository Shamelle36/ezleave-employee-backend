// controllers/attendanceController.js
import { sql } from "../config/db.js";

export async function getEmployeeAttendance(req, res) {
  const { userId } = req.params;
  const { date } = req.query;

  try {
    // 1. Make sure employee exists
    const [employee] = await sql`
      SELECT id_number, first_name, last_name
      FROM employee_list
      WHERE user_id = ${userId}
    `;

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // 2. If date is provided → fetch only that day
    if (date) {
      const [attendance] = await sql`
        SELECT *
        FROM attendance_logs
        WHERE user_id = ${userId} AND attendance_date = ${date}
      `;
      return res.status(200).json(attendance || {});
    }

    // 3. If no date → fetch full history
    const attendanceHistory = await sql`
      SELECT *
      FROM attendance_logs
      WHERE user_id = ${userId}
      ORDER BY attendance_date DESC
    `;

    res.status(200).json(attendanceHistory);
  } catch (error) {
    console.error("❌ Error fetching employee attendance:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
