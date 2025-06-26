const express = require("express");
const { getDashboardSummary } = require("../controllers/dashboardController");
const { protect } = require("../middlewares/authMiddleware"); // Protect dashboard routes

const router = express.Router();

// Route to get dashboard summary data for the authenticated user
router.get("/summary", protect, getDashboardSummary);

module.exports = router;
