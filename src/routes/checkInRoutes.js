const express = require("express");
const {
  performDailyCheckIn,
  getDailyCheckInStatus,
} = require("../controllers/checkInController");
const { protect } = require("../middlewares/authMiddleware"); // Protect check-in routes

const router = express.Router();

router.post("/daily", protect, performDailyCheckIn);
router.get("/status", protect, getDailyCheckInStatus);

module.exports = router;
