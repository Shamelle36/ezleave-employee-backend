import express from "express";
import {
  getLeaveCardByUser,
} from "../controllers/leaveCardController.js";

const router = express.Router();

router.get("/user/:user_id", getLeaveCardByUser);

export default router;
