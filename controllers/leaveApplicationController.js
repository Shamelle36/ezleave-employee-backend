// controllers/leaveController.js
import { sql } from "../config/db.js";

// Add this to your leaveController.js
export async function checkLeaveBalance(req, res) {
  try {
    const { user_id, leave_type, number_of_days } = req.body;

    if (!user_id || !leave_type || !number_of_days) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters"
      });
    }

    // Get employee ID
    const [employee] = await sql`
      SELECT id FROM employee_list WHERE user_id = ${user_id} LIMIT 1;
    `;

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    let availableBalance = 0;
    let hasSufficientBalance = false;
    let message = '';

    // Check if it's Vacation Leave or Sick Leave (from leave_cards)
    if (leave_type === 'Vacation Leave' || leave_type === 'Sick Leave') {
      // Get latest leave card
      const [latestCard] = await sql`
        SELECT *
        FROM leave_cards
        WHERE employee_id = ${employee.id}
        ORDER BY id DESC
        LIMIT 1;
      `;

      if (!latestCard) {
        return res.json({
          success: true,
          can_apply: false,
          available_balance: 0,
          requested_days: number_of_days,
          message: "No leave balance record found"
        });
      }

      if (leave_type === 'Vacation Leave') {
        availableBalance = parseFloat(latestCard.vl_balance) || 0;
        hasSufficientBalance = availableBalance >= number_of_days;
        message = hasSufficientBalance 
          ? `Available VL credits: ${availableBalance.toFixed(3)} days`
          : `Insufficient VL credits. Available: ${availableBalance.toFixed(3)} days, Required: ${number_of_days} days`;
      }
      else if (leave_type === 'Sick Leave') {
        availableBalance = parseFloat(latestCard.sl_balance) || 0;
        hasSufficientBalance = availableBalance >= number_of_days;
        message = hasSufficientBalance 
          ? `Available SL credits: ${availableBalance.toFixed(3)} days`
          : `Insufficient SL credits. Available: ${availableBalance.toFixed(3)} days, Required: ${number_of_days} days`;
      }
    }
    else {
      // ALL OTHER LEAVE TYPES check from leave_entitlements table
      // Map frontend leave types to database codes (from your example table)
      const leaveTypeMapping = {
        'Mandatory/Forced Leave': 'ML',  // From your example table
        'Special Privilege Leave': 'SPL',
        'Maternity Leave': 'MAT',
        'Paternity Leave': 'PAT',
        'Solo Parent Leave': 'SOLO',
        'VAWC Leave': 'VAWC',
        'Rehabilitation Leave': 'RL',
        'Special Leave Benefits for Women': 'MCW',
        'Study Leave': 'STUDY',
        'Special Emergency (Calamity) Leave': 'CALAMITY',
        'Monetization of Leave Credits': 'MOL',
        'Terminal Leave': 'TL',
        'Adoption Leave': 'AL',
        'Emergency Leave': 'EL',  // Added based on your mapping
        'Bereavement Leave': 'BL'  // Added based on your mapping
      };

      const dbLeaveType = leaveTypeMapping[leave_type];
      
      if (!dbLeaveType) {
        return res.status(400).json({
          success: false,
          message: `Invalid leave type: ${leave_type}`
        });
      }

      // Check special leave entitlements
      const [entitlement] = await sql`
        SELECT *
        FROM leave_entitlements
        WHERE user_id = ${employee.id}
          AND leave_type = ${dbLeaveType}
          AND year = EXTRACT(YEAR FROM CURRENT_DATE)
        LIMIT 1;
      `;

      if (entitlement) {
        availableBalance = entitlement.total_days - entitlement.used_days;
        hasSufficientBalance = availableBalance >= number_of_days;
        message = hasSufficientBalance 
          ? `Available ${leave_type}: ${availableBalance} days`
          : `Insufficient ${leave_type}. Available: ${availableBalance} days, Required: ${number_of_days} days`;
      } else {
        // No entitlement record found - use default values from your example
        hasSufficientBalance = availableBalance >= number_of_days;
        message = hasSufficientBalance 
          ? `Available ${leave_type}: ${availableBalance} days (default)`
          : `Insufficient ${leave_type}. Available: ${availableBalance} days (default), Required: ${number_of_days} days`;
      }
    }

    return res.json({
      success: true,
      can_apply: hasSufficientBalance,
      available_balance: availableBalance,
      requested_days: number_of_days,
      leave_type: leave_type,
      message: message,
      requires_confirmation: !hasSufficientBalance
    });

  } catch (error) {
    console.error("Error checking leave balance:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check leave balance"
    });
  }
}

export async function applyLeave(req, res) {
  try {
    const {
      user_id,
      salary,
      date_filing,
      leave_type,
      subtype,
      country,
      details,
      date_from,
      date_to,
      number_of_days,
      commutation_requested,
      attachment
    } = req.body;

    // 1️⃣ Validate required fields
    if (!user_id || !leave_type || !date_from || !date_to || !number_of_days) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
    }

    // 2️⃣ Fetch employee info
    const [employee] = await sql`
      SELECT id, first_name, middle_name, last_name, department, position, email
      FROM employee_list
      WHERE user_id = ${user_id};
    `;

    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: "Employee record not found" 
      });
    }

    const employeeId = employee.id;

    // 3️⃣ CHECK BALANCE BASED ON LEAVE TYPE (for validation only, no deduction)
    let hasSufficientBalance = true;
    let currentBalance = 0;
    let balanceCheckMessage = '';
    let dbLeaveTypeForDeduction = null;

    const leaveTypeMapping = {
      'Mandatory/Forced Leave': 'ML',
      'Special Privilege Leave': 'SPL',
      'Maternity Leave': 'MAT',
      'Paternity Leave': 'PAT',
      'Solo Parent Leave': 'SOLO',
      'VAWC Leave': 'VAWC',
      'Rehabilitation Leave': 'RL',
      'Special Leave Benefits for Women': 'MCW',
      'Study Leave': 'STUDY',
      'Special Emergency (Calamity) Leave': 'CALAMITY',
      'Monetization of Leave Credits': 'MOL',
      'Terminal Leave': 'TL',
      'Adoption Leave': 'AL',
      'Emergency Leave': 'EL',
      'Bereavement Leave': 'BL'
    };

    if (leave_type === 'Monetization of Leave Credits') {
  // Additional validation for monetization
  const { monetization_percentage, monetization_reason, monetization_amount } = req.body;
  
  if (!monetization_percentage || !monetization_reason || !monetization_amount) {
    return res.status(400).json({
      success: false,
      message: "Monetization requires percentage, reason, and amount"
    });
  }
  
  // Validate percentage (typically 50% or more requires justification)
  const percentage = parseInt(monetization_percentage);
  if (percentage < 50) {
    return res.status(400).json({
      success: false,
      message: "Monetization of less than 50% requires special approval"
    });
  }
  
  // Check if enough VL balance for monetization
  const [vlBalance] = await sql`
    SELECT vl_balance FROM leave_cards 
    WHERE employee_id = ${employeeId}
    ORDER BY id DESC LIMIT 1;
  `;
  
  if (!vlBalance || vlBalance.vl_balance < number_of_days) {
    return res.status(400).json({
      success: false,
      message: `Insufficient Vacation Leave balance for monetization. Available: ${vlBalance?.vl_balance || 0} days`
    });
  }
}

    // VL/SL check
    if (leave_type === 'Vacation Leave' || leave_type === 'Sick Leave') {
      const [latestCard] = await sql`
        SELECT *
        FROM leave_cards
        WHERE employee_id = ${employeeId}
        ORDER BY id DESC
        LIMIT 1;
      `;
      if (latestCard) {
        if (leave_type === 'Vacation Leave') {
          currentBalance = parseFloat(latestCard.vl_balance) || 0;
        } else {
          currentBalance = parseFloat(latestCard.sl_balance) || 0;
        }
        if (currentBalance < number_of_days) {
          hasSufficientBalance = false;
          balanceCheckMessage = `Insufficient ${leave_type} credits. Available: ${currentBalance} days, Requested: ${number_of_days} days`;
        }
      } else {
        hasSufficientBalance = false;
        balanceCheckMessage = 'No leave card record found';
      }
    } 
    // Other leave types
    else {
      const dbLeaveType = leaveTypeMapping[leave_type];
      if (!dbLeaveType) {
        return res.status(400).json({
          success: false,
          message: `Invalid leave type: ${leave_type}`
        });
      }
      dbLeaveTypeForDeduction = dbLeaveType;

      const [entitlement] = await sql`
        SELECT *
        FROM leave_entitlements
        WHERE user_id = ${employeeId}
          AND leave_type = ${dbLeaveType}
          AND year = EXTRACT(YEAR FROM CURRENT_DATE)
        LIMIT 1;
      `;

      if (entitlement) {
        currentBalance = entitlement.total_days - entitlement.used_days;
        if (currentBalance < number_of_days) {
          hasSufficientBalance = false;
          balanceCheckMessage = `Insufficient ${leave_type} balance. Available: ${currentBalance} days, Requested: ${number_of_days} days`;
        }
      } else {
        const defaultEntitlements = {
          'ML': 5, 'SPL': 3, 'MAT': 105, 'PAT': 7, 'SOLO': 7,
          'VAWC': 10, 'RL': 0, 'MCW': 60, 'STUDY': 180,
          'CALAMITY': 5, 'MOL': 0, 'TL': 0, 'AL': 0,
          'EL': 0, 'BL': 0
        };
        currentBalance = defaultEntitlements[dbLeaveType] || 0;
        if (currentBalance < number_of_days) {
          hasSufficientBalance = false;
          balanceCheckMessage = `Insufficient ${leave_type} balance. Available: ${currentBalance} days (default), Requested: ${number_of_days} days`;
        }
      }
    }

    // 4️⃣ Reject if insufficient balance
    if (!hasSufficientBalance) {
      return res.status(400).json({
        success: false,
        message: balanceCheckMessage,
        insufficient_balance: true,
        available_balance: currentBalance,
        requested_days: number_of_days
      });
    }

    // 5️⃣ Insert leave application (status pending) — NO BALANCE DEDUCTION HERE
    const result = await sql`
      INSERT INTO leave_applications (
        user_id, first_name, middle_name, last_name,
        office_department, position, salary, date_filing,
        leave_type, subtype, country, details,
        inclusive_dates, number_of_days, commutation_requested,
        attachment,
        status
      )
      VALUES (
        ${user_id},
        ${employee.first_name},
        ${employee.middle_name},
        ${employee.last_name},
        ${employee.department},
        ${employee.position},
        ${salary},
        ${date_filing},
        ${leave_type},
        ${subtype},
        ${country},
        ${details},
        daterange(
          ${date_from}::date,
          (${date_to}::date + INTERVAL '1 day')::date,
          '[)'
        ),
        ${number_of_days},
        ${commutation_requested},
        ${attachment || null},
        'Pending'
      )
      RETURNING *;
    `;

    const leave = result[0];

    // 6️⃣ Send notification (no balance update)
    await sql`
      INSERT INTO notifications (user_id, message)
      VALUES (
        ${user_id},
        ${`${employee.first_name} ${employee.last_name} filed a ${leave_type} leave on ${date_filing}`}
      );
    `;

    return res.status(201).json({ 
      success: true, 
      leave,
      message: `Leave application submitted successfully. ${balanceCheckMessage || `Available balance: ${currentBalance} days`}`
    });

  } catch (err) {
    console.error("❌ Error applying for leave:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to apply leave",
    });
  }
}


export async function getLeaveHistory(req, res) {
  try {
    const { userId } = req.params;

    const leaves = await sql`
      SELECT 
        id,
        leave_type,
        subtype,
        country,
        details,
        lower(inclusive_dates)::date AS date_from,
        (upper(inclusive_dates) - INTERVAL '1 day')::date AS date_to,
        number_of_days,
        status,
        date_filing,
        office_head_status,
        office_head_date,
        hr_status,
        hr_date,
        mayor_status,
        mayor_date,
        approver_name,
        approver_date,
        remarks,
        attachment
      FROM leave_applications
      WHERE user_id = ${userId}
      ORDER BY date_filing DESC;
    `;

    if (leaves.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No leave applications found" });
    }

    // 🧾 Format history nicely for employee app
    const history = leaves.map((leave) => ({
      id: leave.id,
      leave_type: leave.leave_type,
      subtype: leave.subtype,
      country: leave.country,
      details: leave.details,
      date_from: leave.date_from,
      date_to: leave.date_to,
      number_of_days: leave.number_of_days,
      status: leave.status,
      date_filing: leave.date_filing,
      approval_stages: {
        office_head: {
          status: leave.office_head_status,
          date: leave.office_head_date,
        },
        hr: {
          status: leave.hr_status,
          date: leave.hr_date,
        },
        mayor: {
          status: leave.mayor_status,
          date: leave.mayor_date,
        },
      },
      approver_name: leave.approver_name,
      approver_date: leave.approver_date,
      remarks: leave.remarks,
      attachment: leave.attachment,
    }));

    res.json({ success: true, history });
  } catch (err) {
    console.error("Error fetching leave history:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch leave history",
    });
  }
}