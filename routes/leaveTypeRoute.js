import express from 'express';
import { getLeaveTypes } from '../controllers/leaveTypeController.js';

const router = express.Router();

router.get('/', getLeaveTypes);

console.log("✅ leaveTypeRoute mounted");

export default router;