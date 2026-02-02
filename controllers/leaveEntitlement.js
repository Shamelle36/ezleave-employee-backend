import { sql } from "../config/db.js";

export async function getLeaveEntitlements(req, res) {
  const { employeeId } = req.params;
  console.log("Fetching leave data for employee:", employeeId);

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
    // ✅ 1️⃣ Validate employee exists (PRIMARY KEY)
    const [employee] = await sql`
      SELECT id
      FROM employee_list
      WHERE id = ${employeeId}
    `;

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // ✅ 2️⃣ Leave cards (VL & SL)
    const leaveCards = await sql`
      SELECT *
      FROM leave_cards
      WHERE employee_id = ${employeeId}
      ORDER BY id DESC
    `;

    const leaveCard = leaveCards?.[0] ?? null;

    // ✅ 3️⃣ Other leave entitlements
    const otherLeaves = await sql`
      SELECT *
      FROM leave_entitlements
      WHERE employee_id = ${employeeId}
      AND leave_type NOT IN ('VL', 'SL')
      ORDER BY created_at DESC
    `;

    const leaveData = [];

    // ✅ 4️⃣ VL & SL
    if (leaveCard) {
      leaveData.push(
        {
          leave_type: "VL",
          type_name: leaveTypeNames.VL,
          balance_days: Number(leaveCard.vl_balance) || 0,
          total_days: null,
        },
        {
          leave_type: "SL",
          type_name: leaveTypeNames.SL,
          balance_days: Number(leaveCard.sl_balance) || 0,
          total_days: null,
        }
      );
    }

    // ✅ 5️⃣ Other leaves (KEEP leaveTypeNames)
    otherLeaves.forEach((leave) => {
      leaveData.push({
        leave_type: leave.leave_type,
        type_name: leaveTypeNames[leave.leave_type] || leave.leave_type,
        balance_days: Number(leave.balance_days) || 0,
        total_days: Number(leave.total_days) || 0,
      });
    });

    console.log("Final leave data:", leaveData);
    return res.status(200).json(leaveData);

  } catch (error) {
    console.error("Error fetching leave data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
