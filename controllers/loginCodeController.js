import { sql } from '../config/db.js';

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

    // Hash the PIN (in production, use proper hashing like bcrypt)
    // For now, we'll store it as-is but you should hash it
    const hashedPin = pin; // Replace with bcrypt.hash(pin, 10)

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

    // Verify PIN (in production, use bcrypt.compare)
    const isValid = employee.pin === pin; // Replace with bcrypt.compare(pin, employee.pin)

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