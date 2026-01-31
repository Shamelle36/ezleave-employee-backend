import { sql } from '../config/db.js';
import bcrypt from 'bcrypt';

// ========== CODE VERIFICATION FUNCTIONS ==========

// Verify login code (for employee app)
export const verifyLoginCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: "Code is required"
      });
    }

    // Find the code
    const [codeRecord] = await sql`
      SELECT 
        lc.*,
        el.first_name,
        el.last_name,
        el.email,
        el.department,
        el.position,
        el.id_number,
        el.contact_number,
        el.profile_picture
      FROM login_codes lc
      LEFT JOIN employee_list el ON lc.employee_id = el.id
      WHERE lc.code = ${code.toUpperCase()}
    `;

    if (!codeRecord) {
      return res.status(404).json({
        success: false,
        error: "Invalid code"
      });
    }

    // Check if code is already used
    if (codeRecord.is_used) {
      return res.status(400).json({
        success: false,
        error: "Code has already been used",
        used_at: codeRecord.used_at
      });
    }

    // Check if code is expired
    const now = new Date();
    const expiresAt = new Date(codeRecord.expires_at);
    
    if (now > expiresAt) {
      return res.status(400).json({
        success: false,
        error: "Code has expired",
        expired_at: codeRecord.expires_at
      });
    }

    // Mark code as used
    const [updatedCode] = await sql`
      UPDATE login_codes
      SET 
        is_used = TRUE,
        used_at = CURRENT_TIMESTAMP
      WHERE id = ${codeRecord.id}
      RETURNING *
    `;

    res.json({
      success: true,
      message: "Code verified successfully",
      data: {
        code: updatedCode,
        employee: {
          id: codeRecord.employee_id,
          name: codeRecord.employee_name,
          first_name: codeRecord.first_name,
          last_name: codeRecord.last_name,
          email: codeRecord.email,
          department: codeRecord.department,
          position: codeRecord.position,
          id_number: codeRecord.id_number,
          contact_number: codeRecord.contact_number,
          profile_picture: codeRecord.profile_picture
        }
      }
    });

  } catch (error) {
    console.error("❌ Error verifying login code:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify code",
      details: error.message
    });
  }
};

// ========== PIN MANAGEMENT FUNCTIONS ==========

// Check if employee has PIN
export const checkEmployeePIN = async (req, res) => {
  try {
    const { employee_id, id_number } = req.body;

    if (!employee_id || !id_number) {
      return res.status(400).json({
        success: false,
        error: "Employee ID and ID number are required"
      });
    }

    // First verify employee exists and ID matches
    const [employee] = await sql`
      SELECT id, pin FROM employee_list 
      WHERE id = ${employee_id} AND id_number = ${id_number}
    `;
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        has_pin: false,
        error: "Employee not found or ID number mismatch"
      });
    }

    res.json({
      success: true,
      has_pin: !!employee.pin,
      employee_id: employee.id
    });

  } catch (error) {
    console.error("❌ Error checking employee PIN:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check PIN status",
      details: error.message
    });
  }
};

// Create/update employee PIN
export const createEmployeePIN = async (req, res) => {
  try {
    const { employee_id, id_number, pin } = req.body;

    if (!employee_id || !id_number || !pin) {
      return res.status(400).json({
        success: false,
        error: "Employee ID, ID number, and PIN are required"
      });
    }

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      return res.status(400).json({
        success: false,
        error: "PIN must be 6 digits"
      });
    }

    // Verify employee exists and ID matches
    const [employee] = await sql`
      SELECT id FROM employee_list 
      WHERE id = ${employee_id} AND id_number = ${id_number}
    `;
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found or ID number mismatch"
      });
    }

    // Hash the PIN for security
    const saltRounds = 10;
    const hashedPin = await bcrypt.hash(pin, saltRounds);

    // Update employee with PIN
    const [updatedEmployee] = await sql`
      UPDATE employee_list 
      SET pin = ${hashedPin}, pin_set_at = CURRENT_TIMESTAMP
      WHERE id = ${employee_id}
      RETURNING id, first_name, last_name, email, department, position, id_number
    `;

    res.json({
      success: true,
      message: "PIN created successfully",
      data: updatedEmployee
    });

  } catch (error) {
    console.error("❌ Error creating employee PIN:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create PIN",
      details: error.message
    });
  }
};

// Verify PIN for login
export const verifyEmployeePIN = async (req, res) => {
  try {
    const { employee_id, pin } = req.body;

    if (!employee_id || !pin) {
      return res.status(400).json({
        success: false,
        error: "Employee ID and PIN are required"
      });
    }

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      return res.status(400).json({
        success: false,
        error: "PIN must be 6 digits"
      });
    }

    // Get employee with PIN
    const [employee] = await sql`
      SELECT id, pin, first_name, last_name, email, department, position, id_number
      FROM employee_list 
      WHERE id = ${employee_id}
    `;
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found"
      });
    }

    if (!employee.pin) {
      return res.status(400).json({
        success: false,
        error: "PIN not set for this employee"
      });
    }

    // Verify PIN using bcrypt
    const isValid = await bcrypt.compare(pin, employee.pin);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid PIN"
      });
    }

    res.json({
      success: true,
      message: "PIN verified successfully",
      data: {
        employee: {
          id: employee.id,
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          department: employee.department,
          position: employee.position,
          id_number: employee.id_number
        }
      }
    });

  } catch (error) {
    console.error("❌ Error verifying employee PIN:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify PIN",
      details: error.message
    });
  }
};

// ========== ADDITIONAL HELPER FUNCTIONS ==========

// Check employee status (for login)
export const checkEmployeeStatus = async (req, res) => {
  try {
    const { id_number } = req.body;

    if (!id_number) {
      return res.status(400).json({
        success: false,
        error: "ID number is required"
      });
    }

    const [employee] = await sql`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        department,
        position,
        id_number,
        pin,
        status
      FROM employee_list 
      WHERE id_number = ${id_number}
    `;
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found"
      });
    }

    // Check if employee is active
    if (employee.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: "Employee account is not active"
      });
    }

    res.json({
      success: true,
      has_pin: !!employee.pin,
      employee: {
        id: employee.id,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        department: employee.department,
        position: employee.position,
        id_number: employee.id_number
      }
    });

  } catch (error) {
    console.error("❌ Error checking employee status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check employee status",
      details: error.message
    });
  }
};

// Reset PIN (if needed)
export const resetEmployeePIN = async (req, res) => {
  try {
    const { employee_id, id_number } = req.body;

    if (!employee_id || !id_number) {
      return res.status(400).json({
        success: false,
        error: "Employee ID and ID number are required"
      });
    }

    // Verify employee exists
    const [employee] = await sql`
      SELECT id FROM employee_list 
      WHERE id = ${employee_id} AND id_number = ${id_number}
    `;
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found"
      });
    }

    // Clear the PIN
    await sql`
      UPDATE employee_list 
      SET pin = NULL, pin_set_at = NULL
      WHERE id = ${employee_id}
    `;

    res.json({
      success: true,
      message: "PIN reset successfully. Employee will need to create a new PIN."
    });

  } catch (error) {
    console.error("❌ Error resetting employee PIN:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reset PIN",
      details: error.message
    });
  }
};