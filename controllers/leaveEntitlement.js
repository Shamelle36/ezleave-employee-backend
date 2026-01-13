import { sql } from "../config/db.js";

export async function getLeaveEntitlements(req, res) {
  const { userId } = req.params;
  console.log("Fetching leave data for Clerk user:", userId);

  const leaveTypeNames = {
    VL: "Vacation Leave",
    SL: "Sick Leave",
    ML: "Mandatory Leave",
    SPL: "Special Privilege Leave",
    MAT: "Maternity Leave",
    PAT: "Paternity Leave",
    SOLO: "Solo Parent Leave",
    VAWC: "VAWC Leave",
    RL: "Rehabilitation Leave",
    MCW: "Magna Carta for Women",
    STUDY: "Study Leave",
    CALAMITY: "Calamity Leave",
    MOL: "Monetization Leave",
    TL: "Terminal Leave",
    AL: "Adoption Leave",
  };

  try {
    // 1️⃣ Get employee id from Clerk user_id - FIX THIS LINE
    const [employee] = await sql`
      SELECT id
      FROM employee_list
      WHERE user_id = ${userId}
    `;
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const employeeId = employee.id;

    // 2️⃣ Fetch all leave cards for this employee, order by period DESC
    const leaveCards = await sql`
      SELECT *
      FROM leave_cards
      WHERE employee_id = ${employeeId}
      ORDER BY id DESC
    `;

    let leaveCard = null;
    if (leaveCards && leaveCards.length > 0) {
      leaveCard = leaveCards[0];
    }

    // 3️⃣ Fetch other leave entitlements for this employee
    const otherLeaves = await sql`
      SELECT *
      FROM leave_entitlements
      WHERE user_id = ${employeeId}
      AND leave_type NOT IN ('VL', 'SL')
      ORDER BY created_at DESC
    `;

    const leaveData = [];

    // 4️⃣ VL & SL from leaveCard
    if (leaveCard) {
      leaveData.push({
        leave_type: "VL",
        type_name: leaveTypeNames["VL"],
        balance_days: Number(leaveCard.vl_balance) || 0,
        total_days: null,
      });
      leaveData.push({
        leave_type: "SL",
        type_name: leaveTypeNames["SL"],
        balance_days: Number(leaveCard.sl_balance) || 0,
        total_days: null,
      });
    } else {
      console.warn(`No leave cards found for employee ${employeeId}`);
    }

    // 5️⃣ Other leave entitlements
    if (otherLeaves && otherLeaves.length > 0) {
      otherLeaves.forEach((leave) => {
        leaveData.push({
          leave_type: leave.leave_type,
          type_name: leaveTypeNames[leave.leave_type] || leave.leave_type,
          balance_days: Number(leave.balance_days) || 0,
          total_days: Number(leave.total_days) || 0,
        });
      });
    } else {
      console.log(`No other leave entitlements found for employee ${employeeId}`);
    }

    console.log("Final leave data:", leaveData);
    return res.status(200).json(leaveData);
  } catch (error) {
    console.error("Error fetching leave data:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}
