import express from 'express';
import {
  checkEmployeePIN,
  createEmployeePIN,
  verifyEmployeePIN
} from '../controllers/loginCodeController.js';

const router = express.Router();

// PIN management routes
router.post('/check-pin', checkEmployeePIN);
router.post('/create-pin', createEmployeePIN);
router.post('/verify-pin', verifyEmployeePIN);

export default router;