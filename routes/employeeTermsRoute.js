import express from "express";
import { getEmployeeTerms } from "../controllers/employeeTermsController.js";

const router = express.Router();

// Public for all employees
router.get("/terms", getEmployeeTerms);


export default router;
