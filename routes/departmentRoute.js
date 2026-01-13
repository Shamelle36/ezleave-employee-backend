import express from 'express';
import { createDepartment, getDepartmentById } from '../controllers/departmentController.js';

const router = express.Router();

router.get('/:departmentId', getDepartmentById);
router.post('/', createDepartment);

export default router;