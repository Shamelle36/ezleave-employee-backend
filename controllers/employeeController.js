// In employeeController.js
import { sql } from '../config/db.js';

// === MAIN FUNCTION TO GET EMPLOYEE BY ID ===
export async function getEmployeeById(req, res) {
  try {
    const { id } = req.params;
    
    console.log(`🔍 Fetching employee with ID: ${id}`);
    
    const [employee] = await sql`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        department,
        position,
        id_number,
        contact_number,
        profile_picture,
        gender,
        civil_status,
        address,
        date_hired,
        employment_status,
        status,
        pin,
        pin_set_at,
        created_at,
        updated_at
      FROM employee_list 
      WHERE id = ${id}
    `;
    
    if (!employee) {
      console.log(`❌ Employee not found with ID: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    console.log(`✅ Found employee: ${employee.first_name} ${employee.last_name}`);
    res.status(200).json({
      success: true,
      data: employee
    });

  } catch (error) {
    console.error('❌ Error fetching employee:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
}

// === REMOVE OR DEPRECATE getEmployeeByUserId ===
// Since you removed Clerk, you don't need this function
// Or keep it but rename the parameter

// === CREATE EMPLOYEE (Updated - remove user_id) ===
export async function createEmployee(req, res) {
  try {
    const { 
      id_number, 
      name, 
      first_name,
      last_name,
      gender, 
      civil_status, 
      position, 
      department, 
      email, 
      phone_number, 
      contact_number,
      address, 
      date_hired, 
      employment_status, 
      profile_picture 
    } = req.body;

    // Validate required fields
    const requiredFields = ['id_number', 'first_name', 'last_name', 'email'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: `Required fields missing: ${missingFields.join(', ')}` 
      });
    }

    const employee = await sql`
      INSERT INTO employee_list (
        id_number, 
        name,
        first_name,
        last_name,
        gender, 
        civil_status, 
        position, 
        department,
        email, 
        phone_number,
        contact_number,
        address, 
        date_hired,
        employment_status, 
        profile_picture
      ) VALUES (
        ${id_number}, 
        ${name || `${first_name} ${last_name}`},
        ${first_name},
        ${last_name},
        ${gender}, 
        ${civil_status}, 
        ${position}, 
        ${department},
        ${email}, 
        ${phone_number},
        ${contact_number || phone_number},
        ${address}, 
        ${date_hired},
        ${employment_status}, 
        ${profile_picture}
      ) RETURNING *`;

    console.log('✅ Employee created:', employee[0]);
    res.status(201).json({
      success: true,
      data: employee[0]
    });

  } catch (error) {
    console.error('❌ Error creating employee:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// === DELETE EMPLOYEE ===
export async function deleteEmployee(req, res) {
  try {
    const { id } = req.params;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid employee ID' 
      });
    }

    const deletedEmployee = await sql`
      DELETE FROM employee_list 
      WHERE id = ${id} 
      RETURNING *`;
    
    if (deletedEmployee.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully',
      data: deletedEmployee[0]
    });

  } catch (error) {
    console.error('❌ Error deleting employee:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
}

// === UPDATE EMPLOYEE ===
export async function updateEmployee(req, res) {
  try {
    const { id } = req.params;
    const { 
      id_number,
      name,
      first_name,
      last_name,
      gender,
      civil_status,
      position,
      department,
      email,
      phone_number,
      contact_number,
      address,
      date_hired,
      employment_status,
      profile_picture 
    } = req.body;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid employee ID' 
      });
    }

    const updateEmployee = await sql`
      UPDATE employee_list
      SET 
        id_number = ${id_number},
        name = ${name || `${first_name} ${last_name}`},
        first_name = ${first_name},
        last_name = ${last_name},
        gender = ${gender},
        civil_status = ${civil_status},
        position = ${position},
        department = ${department},
        email = ${email},
        phone_number = ${phone_number},
        contact_number = ${contact_number || phone_number},
        address = ${address},
        date_hired = ${date_hired},
        employment_status = ${employment_status},
        profile_picture = ${profile_picture},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *`;

    if (updateEmployee.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: updateEmployee[0]
    });

  } catch (error) {
    console.error('❌ Error updating employee:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
}

// === CHECK EMPLOYEE EMAIL ===
export async function checkEmployeeEmail(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    const [employee] = await sql`
      SELECT * FROM employee_list 
      WHERE email = ${email}
    `;

    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'This application is only available to authorized employees. If you think you should have access, please contact HR or the system administrator.' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Authorized', 
      data: employee 
    });

  } catch (error) {
    console.error('❌ Error checking employee email:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
}

// === CHECK LOGIN EMAIL ===
export async function checkLoginEmail(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    const [employee] = await sql`
      SELECT * FROM employee_list 
      WHERE email = ${email}
    `;

    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'This application is only available to authorized employees. If you think you should have access, please contact HR or the system administrator.' 
      });
    }

    // Check if employee is active
    if (employee.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact HR or system administrator for assistance.',
        status: 'inactive'
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Authorized for login', 
      data: employee
    });

  } catch (error) {
    console.error('❌ Error checking login email:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
}

// === UPDATE EMPLOYEE PROFILE ===
export async function updateEmployeeProfile(req, res) {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      contact_number,
      civil_status,
      gender,
      profile_picture,
    } = req.body;

    console.log(`🔄 Updating profile for employee ID: ${id}`);

    const updated = await sql`
      UPDATE employee_list
      SET 
        first_name = ${first_name},
        last_name = ${last_name},
        contact_number = ${contact_number},
        civil_status = ${civil_status},
        gender = ${gender},
        profile_picture = ${profile_picture},
        name = ${first_name} || ' ' || ${last_name},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING 
        id, 
        first_name, 
        last_name, 
        contact_number, 
        civil_status, 
        gender, 
        profile_picture, 
        updated_at
    `;

    if (updated.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: "Employee not found" 
      });
    }

    res.status(200).json({ 
      success: true, 
      data: updated[0] 
    });

  } catch (error) {
    console.error("❌ Error updating employee profile:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
}

// === GET EMPLOYEE BY EMAIL ===
export async function getEmployeeByEmail(req, res) {
  try {
    const { email } = req.params;
    
    console.log(`🔍 Fetching employee with email: ${email}`);
    
    const [employee] = await sql`
      SELECT * FROM employee_list 
      WHERE email = ${email}
    `;
    
    if (!employee) {
      console.log(`❌ Employee not found with email: ${email}`);
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    console.log(`✅ Found employee: ${employee.first_name} ${employee.last_name}`);
    res.status(200).json({
      success: true,
      data: employee
    });

  } catch (error) {
    console.error('❌ Error fetching employee by email:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
}

// === GET ALL EMPLOYEES ===
export async function getAllEmployees(req, res) {
  try {
    const employees = await sql`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        department,
        position,
        id_number,
        contact_number,
        employment_status,
        status,
        created_at
      FROM employee_list 
      ORDER BY created_at DESC
    `;
    
    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });

  } catch (error) {
    console.error('❌ Error fetching all employees:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
}

// === GET EMPLOYEE DASHBOARD DATA ===
export async function getEmployeeDashboard(req, res) {
  try {
    const { id } = req.params;
    
    console.log(`📊 Fetching dashboard for employee ID: ${id}`);
    
    // Get employee basic info
    const [employee] = await sql`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        department,
        position,
        id_number,
        contact_number,
        profile_picture,
        gender,
        civil_status,
        address,
        date_hired,
        employment_status,
        created_at
      FROM employee_list 
      WHERE id = ${id}
    `;
    
    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    // Get leave balances (example - adjust based on your schema)
    let leaveBalances = {};
    try {
      const [balances] = await sql`
        SELECT 
          COALESCE(SUM(CASE WHEN leave_type = 'vacation' AND status = 'approved' THEN days ELSE 0 END), 0) as vacation_used,
          COALESCE(SUM(CASE WHEN leave_type = 'sick' AND status = 'approved' THEN days ELSE 0 END), 0) as sick_used
        FROM leave_requests 
        WHERE employee_id = ${id}
      `;
      leaveBalances = balances || {};
    } catch (error) {
      console.log('ℹ️ No leave_requests table or error:', error.message);
    }

    // Get recent attendance (example)
    let recentAttendance = [];
    try {
      recentAttendance = await sql`
        SELECT * FROM attendance 
        WHERE employee_id = ${id}
        ORDER BY date DESC
        LIMIT 5
      `;
    } catch (error) {
      console.log('ℹ️ No attendance table or error:', error.message);
    }

    res.status(200).json({
      success: true,
      data: {
        employee,
        leaveBalances: {
          ...leaveBalances,
          vacation_remaining: 15 - (leaveBalances.vacation_used || 0),
          sick_remaining: 10 - (leaveBalances.sick_used || 0)
        },
        recentAttendance
      }
    });

  } catch (error) {
    console.error('❌ Error fetching employee dashboard:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
}