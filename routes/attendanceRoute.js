import express from "express";
import { getEmployeeAttendance } from "../controllers/attendanceController.js";

const router = express.Router();

router.get("/:userId", getEmployeeAttendance);

export default router;
