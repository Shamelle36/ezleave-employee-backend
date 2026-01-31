import express from 'express';
import {
  verifyLoginCode,
  checkEmployeePIN,
  createEmployeePIN,
  verifyEmployeePIN,
  checkEmployeeStatus,
  resetEmployeePIN
} from '../controllers/loginCodeController.js';

const router = express.Router();

// Code verification
router.post('/verify-code', verifyLoginCode);

// PIN management
router.post('/check-pin', checkEmployeePIN);
router.post('/create-pin', createEmployeePIN);
router.post('/verify-pin', verifyEmployeePIN);

// Employee status
router.post('/check-status', checkEmployeeStatus);
router.post('/reset-pin', resetEmployeePIN);

export default router;