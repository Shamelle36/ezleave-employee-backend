import { sql } from '../config/db.js';

export async function getDepartmentById (req, res) {
    try {
        const { departmentId } = req.params;

        const department = await sql `
            SELECT * FROM department WHERE id = ${departmentId} ORDER BY created_at DESC`
        
        res.status(200).json(department);
    } catch (error) {
        console.log('Error fetching department:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export async function createDepartment (req, res) {
    try {
        const {name, description} = req.body;

        const department = await sql `
            INSERT INTO department (name, description)
            VALUES (${name}, ${description})`;

        res.status(201).json(department[0]);
    } catch (error) {
        console.log('Error creating department:', error);
        res.status(500).json({message:'Internal server error'});
    }
}