import { sql } from '../config/db.js';

export async function getEmployeeByUserId(req, res) {
  try {
    const { userId } = req.params;
    
    const [employee] = await sql `
      SELECT * FROM employee_list WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 1`
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json(employee);

  } catch (error) {
    console.log('Error fetching employee:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
    
export async function createEmployee(req, res) {
        try {
            const { user_id, id_number, name, gender, 
                    civil_status, position, department, 
                    email, phone_number, address, date_hired, 
                    employment_status, profile_picture } = req.body;
    
                    if (!user_id || !id_number || !name || !email) {
                        return res.status(400).json({ message: 'Required fields are missing' });
                    }
    
                    const employee = await sql`
                        INSERT INTO employee_list (user_id, id_number, name,
                        gender, civil_status, position, department,
                        email, phone_number, address, date_hired,
                        employment_status, profile_picture)
                        VALUES (${user_id}, ${id_number}, ${name},
                        ${gender}, ${civil_status}, ${position}, ${department},
                        ${email}, ${phone_number}, ${address}, ${date_hired},
                        ${employment_status}, ${profile_picture})
                        RETURNING *
                        `;
    
                        console.log(employee);
                        res.status(201).json(employee[0]);
    
        } catch (error) {
            console.log('Error creating employee:', error);
            res.status(500).json({message:'Internal server error'});
        }
    }

export async function deleteEmployee (req, res) {
    try {
        const { id } = req.params;

        if(isNaN(parseInt(id))) {
            return res.status(400).json({ message: 'Invalid employee ID' });
        }

        const deleteEmployee = await sql `
            DELETE FROM employee_list WHERE id = ${id} RETURNING *`;
        
        if(deleteEmployee.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.status(200).json({message:'Employee deleted successfully'});

    } catch (error) {
        console.log('Error deleting employee:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export async function updateEmployee (req, res) {
    try {
        const { id } = req.params;
        const { user_id, id_number, name,
                gender, civil_status, position,
                department, email, phone_number,
                address, date_hired, employment_status,
                profile_picture } = req.body;

        if(isNaN(parseInt(id))) {
            return res.status(400).json({ message: 'Invalid employee ID' });
        }

        const updateEmployee = await sql`
            UPDATE employee_list
            SET user_id = ${user_id},
                id_number = ${id_number},
                name = ${name},
                gender = ${gender},
                civil_status = ${civil_status},
                position = ${position},
                department = ${department},
                email = ${email},
                phone_number = ${phone_number},
                address = ${address},
                date_hired = ${date_hired},
                employment_status = ${employment_status},
                profile_picture = ${profile_picture},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *`;

        if(updateEmployee.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.status(200).json(updateEmployee[0]);


    } catch (error) {
        console.log('Error updating employee:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export async function checkEmployeeEmail(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const [employee] = await sql`
      SELECT * FROM employee_list WHERE email = ${email}
    `;

    if (!employee) {
      return res.status(404).json({ 
        success: false,
        message: 'This application is only available to authorized employees. If you think you should have access, please contact HR or the system administrator.' 
      });
    }

    // Check if user is inactive
    if (employee.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact HR or system administrator for assistance.',
        status: 'inactive'
      });
    }

    if (employee.user_id) {
      return res.status(403).json({
        success: false,
        message: 'This email is already registered. Please log in instead.',
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Authorized', 
      employee,
      isActive: employee.status === 'active'
    });
  } catch (error) {
    console.error('Error checking employee email:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
}

// Employee self-update (profile edit)
export async function updateEmployeeProfile(req, res) {
  try {
    const { userId } = req.params;
    const {
      first_name,
      last_name,
      contact_number,
      civil_status,
      gender,
      profile_picture,
    } = req.body;

    // Only allow updating personal info
    const updated = await sql`
      UPDATE employee_list
      SET first_name = ${first_name},
          last_name = ${last_name},
          contact_number = ${contact_number},
          civil_status = ${civil_status},
          gender = ${gender},
          profile_picture = ${profile_picture},
          updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING id, user_id, first_name, last_name, contact_number, civil_status, gender, profile_picture, updated_at
    `;

    if (updated.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.status(200).json({ success: true, employee: updated[0] });
  } catch (error) {
    console.error("Error updating employee profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function attachUserIdToEmployee(req, res) {
  try {
    const { email, user_id } = req.body;

    if (!email || !user_id) {
      return res.status(400).json({ message: "Email and user_id are required" });
    }

    // Ensure employee exists
    const [employee] = await sql`
      SELECT * FROM employee_list WHERE email = ${email}
    `;

    if (!employee) {
      return res.status(404).json({ message: "Employee email not found" });
    }

    // Update employee_list with user_id
    const updated = await sql`
      UPDATE employee_list
      SET user_id = ${user_id}
      WHERE email = ${email}
      RETURNING *
    `;

    res.status(200).json({ success: true, employee: updated[0] });

  } catch (error) {
    console.error("Error attaching user_id:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}


export async function createUserRecord(req, res) {
  try {
    const { user_id, email, first_name, last_name } = req.body;

    if (!user_id || !email) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await sql`
      INSERT INTO users (user_id, email, first_name, last_name)
      VALUES (${user_id}, ${email}, ${first_name}, ${last_name})
      ON CONFLICT (user_id) DO NOTHING
      RETURNING *
    `;

    res.status(201).json({ success: true, user: user[0] });
  } catch (error) {
    console.error("Error creating user record:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
