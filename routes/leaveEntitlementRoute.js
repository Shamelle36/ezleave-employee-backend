import express from 'express';
import { getLeaveEntitlements } from '../controllers/leaveEntitlement.js';

const router = express.Router();

router.get('/:userId', getLeaveEntitlements);


export default router;
