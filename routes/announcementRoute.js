// routes/announcementRoute.js
import express from "express";
import { getAnnouncements } from "../controllers/announcementController.js";

const router = express.Router();

router.get("/", getAnnouncements); 
// router.get("/:id", getAnnouncementById); 

export default router;
