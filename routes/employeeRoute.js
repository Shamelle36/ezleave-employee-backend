import express from 'express';
import { createEmployee, deleteEmployee, getEmployeeByUserId, updateEmployee, checkEmployeeEmail, updateEmployeeProfile, createUserRecord, attachUserIdToEmployee } from '../controllers/employeeController.js';

const router = express.Router();

router.get('/:userId', getEmployeeByUserId);
router.post('/', createEmployee);
router.delete('/:id', deleteEmployee);
router.put('/:id', updateEmployee);
router.post('/check-email', checkEmployeeEmail);
router.patch("/:userId/profile", updateEmployeeProfile);
router.post('/create', createUserRecord);
router.post('/attach-user-id', attachUserIdToEmployee);

export default router;