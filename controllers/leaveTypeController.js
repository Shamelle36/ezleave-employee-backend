import { sql } from '../config/db.js';

export async function getLeaveTypes(req, res) {
    try {
        const leaveTypes = await sql`
            SELECT * 
            FROM leave_types 
            ORDER BY created_at DESC
        `;
        res.status(200).json(leaveTypes);
    } catch (error) {
        console.error('Error fetching leave types:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}