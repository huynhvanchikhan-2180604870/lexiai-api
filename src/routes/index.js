const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const vocabRoutes = require("./vocabRoutes");
const aiRoutes = require("./aiRoutes");
const chatRoutes = require("./chatRoutes");
const exerciseRoutes = require("./exerciseRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const checkInRoutes = require("./checkInRoutes"); // Import check-in routes

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/vocabulary", vocabRoutes);
router.use("/ai", aiRoutes);
router.use("/chat", chatRoutes);
router.use("/exercises", exerciseRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/check-in", checkInRoutes); // Add check-in routes

module.exports = router;
