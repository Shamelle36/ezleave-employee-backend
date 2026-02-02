import express from 'express';
import { 
  createEmployee, 
  checkLoginEmail, 
  deleteEmployee, 
  getEmployeeById,  // Changed from getEmployeeByUserId
  updateEmployee, 
  checkEmployeeEmail, 
  updateEmployeeProfile, 
  getEmployeeByEmail,
  getAllEmployees,
  getEmployeeDashboard
} from '../controllers/employeeController.js';

const router = express.Router();

// GET routes (order matters - specific before generic)
router.get('/all', getAllEmployees);              // GET /api/employees/all
router.get('/dashboard/:id', getEmployeeDashboard); // GET /api/employees/dashboard/:id
router.get('/email/:email', getEmployeeByEmail);  // GET /api/employees/email/:email
router.get('/:id', getEmployeeById);              // GET /api/employees/:id (This should be LAST)

// POST routes
router.post('/', createEmployee);
router.post('/check-email', checkEmployeeEmail);
router.post('/check-login', checkLoginEmail);

// PUT/PATCH routes
router.put('/:id', updateEmployee);
router.patch('/:id/profile', updateEmployeeProfile);

// DELETE route
router.delete('/:id', deleteEmployee);

export default router;