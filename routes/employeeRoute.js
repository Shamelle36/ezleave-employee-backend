import express from 'express';
import { createEmployee, checkLoginEmail, 
    deleteEmployee, getEmployeeByUserId, 
    updateEmployee, checkEmployeeEmail, 
    updateEmployeeProfile, createUserRecord, 
    attachUserIdToEmployee, getEmployeeById, getEmployeeByEmail } from '../controllers/employeeController.js';

const router = express.Router();

router.get('/:userId', getEmployeeByUserId);
router.get('/id/:id', getEmployeeById);  // Add this route
router.get('/email/:email', getEmployeeByEmail);
router.post('/', createEmployee);
router.delete('/:id', deleteEmployee);
router.put('/:id', updateEmployee);
router.post('/check-email', checkEmployeeEmail);
router.post('/check-login', checkLoginEmail);
router.patch("/:userId/profile", updateEmployeeProfile);
router.post('/create', createUserRecord);
router.post('/attach-user-id', attachUserIdToEmployee);

export default router;